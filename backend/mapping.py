"""Pure mapping from a CXAS structured response to the frontend's chat shape.

This module is intentionally **network-free and side-effect-free** so it can be
unit-tested without billing, credentials, or the ``cxas_scrapi`` SDK. Every
function here is a pure transform over plain ``dict`` data.

--------------------------------------------------------------------------------
Expected CXAS structured-response contract (input)
--------------------------------------------------------------------------------
``map_structured_response`` consumes the dict produced by
``cxas_scrapi.Sessions.get_structured_response(...)``, which has the shape::

    {
      "agent_text":     str,            # the assistant's natural-language reply
      "tool_calls":     [{"action": <tool_name>, "args": {...}}, ...],
      "tool_responses": [{"action": "_response:<tool_name>",
                          "args": {}, "response": {...}}, ...],
      "payload":        dict | None,    # custom structured payload from the agent
      "session_ended":  bool,
      "citations":      list,
      ...
    }

The agent drives the UI through the **custom payload** (the documented channel
for structured card data) and/or its **tool calls/responses**. We map both
defensively — tolerating missing keys, partial data, and either a payload-first
or tool-first style — so the contract holds regardless of which channel the live
agent uses on a given turn.

The agent SHOULD return a custom ``payload`` shaped like one of::

    # after search_properties / a recommendation
    {"action": "search_properties",
     "card": { "type": "property", "id": ..., "name": ..., "location": ...,
               "rating": ..., "ratingLabel": ..., "reviews": ..., "price": "$340",
               "priceUnit": "/night", "tags": [...], "cta": "Check Availability" }}

    # after create_booking
    {"action": "create_booking",
     "card": { "type": "confirmation", "confirmationNumber": "BK-7824091",
               "property": ..., "dates": ..., "room": ..., "nights": 3,
               "total": "$1,017", "status": "Confirmed" }}

    # after add_upsell
    {"action": "add_upsell",
     "card": { "type": "confirmation_update", "confirmationNumber": "BK-7824091",
               "addOn": ..., "addOnPrice": "$475", "updatedTotal": "$1,492",
               "status": "Updated" },
     # optional upsell *offer* card shown before the user accepts:
     "offer": { "type": "upsell", "name": ..., "description": ..., "price": "$475",
                "priceContext": "for 3 days", "cta": "Add to Booking" }}

If the agent only returns tool calls (no hand-built card), we synthesise the
card and the ``site_action`` from the tool name + args/response instead. ``action``
may live at the payload top level, in ``payload["tool"]``, or be inferred from the
most recent ``tool_calls`` / ``tool_responses`` entry.

--------------------------------------------------------------------------------
Output contract (consumed by the frontend ``useCXASAgent`` hook)
--------------------------------------------------------------------------------
    {
      "agent_response": str,
      "cards":          list[dict],     # 0+ inline chat cards (frontend renders cards[0])
      "site_action":    dict | None,    # navigate / updateConfirmation directive
    }

Card shapes (mirroring ``frontend/src/lib/types.ts``):
  - property:            {type, id, name, location, rating, ratingLabel, reviews,
                          price, priceUnit, tags, cta}
  - confirmation:        {type, confirmationNumber, property, dates, room, nights,
                          total, status}
  - upsell:              {type, name, description, price, priceContext, cta}
  - confirmation_update: {type, confirmationNumber, addOn, addOnPrice,
                          updatedTotal, status}

site_action shape:
  {type: 'navigate'|'updateConfirmation', to?, highlight?, selectRoom?, data?,
   addOn?, updatedTotal?}  with ``to`` in {'home','search','property','confirmation'}.
"""

from __future__ import annotations

from typing import Any

# Tool / action names the agent uses. The mapping keys off these.
ACTION_SEARCH = "search_properties"
ACTION_AVAILABILITY = "check_availability"
ACTION_BOOKING = "create_booking"
ACTION_UPSELL = "add_upsell"

# Valid frontend views for ``site_action.to``.
_VALID_VIEWS = {"home", "search", "property", "confirmation"}


# --------------------------------------------------------------------------- #
# Small, defensive helpers
# --------------------------------------------------------------------------- #
def _as_dict(value: Any) -> dict[str, Any]:
    """Return ``value`` if it's a dict, else an empty dict (never raises)."""
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    """Return ``value`` if it's a list, else an empty list (never raises)."""
    return value if isinstance(value, list) else []


def _first_present(*candidates: Any, default: Any = None) -> Any:
    """Return the first candidate that is neither ``None`` nor an empty string."""
    for candidate in candidates:
        if candidate is not None and candidate != "":
            return candidate
    return default


def _format_price(value: Any) -> Any:
    """Normalise a price into the frontend's display string (e.g. ``"$340"``).

    Accepts an already-formatted string (returned as-is), or a number which is
    rendered with a leading ``$`` and thousands separators. Unknown types are
    returned unchanged so we never lose data.
    """
    if isinstance(value, str):
        return value
    if isinstance(value, bool):  # guard: bool is a subclass of int
        return value
    if isinstance(value, (int, float)):
        # Whole numbers render without a trailing ``.0``; keep cents otherwise.
        if float(value).is_integer():
            return f"${int(value):,}"
        return f"${value:,.2f}"
    return value


def _detect_action(payload: dict[str, Any], structured: dict[str, Any]) -> str | None:
    """Determine which funnel action a turn represents.

    Resolution order (most explicit first):
      1. ``payload["action"]`` or ``payload["tool"]``.
      2. The card ``type`` carried in the payload.
      3. The most recent tool call / tool response action name.
    """
    explicit = _first_present(payload.get("action"), payload.get("tool"))
    if isinstance(explicit, str) and explicit:
        return explicit

    card_type = _as_dict(payload.get("card")).get("type")
    type_to_action = {
        "property": ACTION_SEARCH,
        "confirmation": ACTION_BOOKING,
        "confirmation_update": ACTION_UPSELL,
        "upsell": ACTION_UPSELL,
    }
    if isinstance(card_type, str) and card_type in type_to_action:
        return type_to_action[card_type]

    # Fall back to the latest tool signal. ``tool_responses`` names are prefixed
    # with ``_response:`` by ``get_structured_response``; strip that.
    tool_responses = _as_list(structured.get("tool_responses"))
    if tool_responses:
        name = _as_dict(tool_responses[-1]).get("action", "")
        if isinstance(name, str):
            name = name.split(":", 1)[-1]
            if name:
                return name

    tool_calls = _as_list(structured.get("tool_calls"))
    if tool_calls:
        name = _as_dict(tool_calls[-1]).get("action")
        if isinstance(name, str) and name:
            return name

    return None


def _merged_action_args(
    action: str, payload: dict[str, Any], structured: dict[str, Any]
) -> dict[str, Any]:
    """Collect the most relevant data dict for ``action``.

    Merges (in increasing priority): the matching tool-call ``args``, the
    matching tool-response ``response``, and any explicit ``payload['data']``.
    Later sources win so a hand-built payload can override tool data.
    """
    merged: dict[str, Any] = {}

    for call in _as_list(structured.get("tool_calls")):
        call_dict = _as_dict(call)
        if call_dict.get("action") == action:
            merged.update(_as_dict(call_dict.get("args")))

    for resp in _as_list(structured.get("tool_responses")):
        resp_dict = _as_dict(resp)
        name = resp_dict.get("action", "")
        if isinstance(name, str) and name.split(":", 1)[-1] == action:
            merged.update(_as_dict(resp_dict.get("response")))

    merged.update(_as_dict(payload.get("data")))
    return merged


# --------------------------------------------------------------------------- #
# Per-action card + site_action builders
# --------------------------------------------------------------------------- #
def _build_property(
    card_in: dict[str, Any], data: dict[str, Any]
) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
    """search_properties → property card + navigate→search (highlight = id)."""
    prop_id = _first_present(card_in.get("id"), data.get("id"), data.get("property_id"))
    card: dict[str, Any] = {
        "type": "property",
        "id": prop_id,
        "name": _first_present(card_in.get("name"), data.get("name")),
        "location": _first_present(card_in.get("location"), data.get("location")),
        "rating": _first_present(card_in.get("rating"), data.get("rating")),
        "ratingLabel": _first_present(
            card_in.get("ratingLabel"), data.get("ratingLabel"), data.get("rating_label")
        ),
        "reviews": _first_present(card_in.get("reviews"), data.get("reviews")),
        "price": _format_price(
            _first_present(card_in.get("price"), data.get("price"), data.get("nightly_rate"))
        ),
        "priceUnit": _first_present(
            card_in.get("priceUnit"), data.get("priceUnit"), data.get("price_unit"),
            default="/night",
        ),
        "tags": _as_list(_first_present(card_in.get("tags"), data.get("tags"), default=[])),
        "cta": _first_present(card_in.get("cta"), data.get("cta"), default="Check Availability"),
    }
    if card_in.get("image") or data.get("image"):
        card["image"] = _first_present(card_in.get("image"), data.get("image"))

    site_action: dict[str, Any] = {"type": "navigate", "to": "search"}
    if prop_id:
        site_action["highlight"] = prop_id
    return [card], site_action


def _build_availability(
    card_in: dict[str, Any], data: dict[str, Any]
) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
    """check_availability → navigate→property (pre-select the room).

    No inline card by default — availability is reflected on the property page.
    A hand-built card in the payload (if any) is still passed through.
    """
    room_id = _first_present(
        card_in.get("selectRoom"), data.get("room_id"), data.get("roomId"), data.get("room")
    )
    site_action: dict[str, Any] = {"type": "navigate", "to": "property"}
    if room_id:
        site_action["selectRoom"] = room_id

    prop_id = _first_present(data.get("property_id"), data.get("id"))
    if prop_id:
        site_action["highlight"] = prop_id

    cards = [card_in] if card_in else []
    return cards, site_action


def _build_booking(
    card_in: dict[str, Any], data: dict[str, Any]
) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
    """create_booking → confirmation card + navigate→confirmation (with data)."""
    confirmation_number = _first_present(
        card_in.get("confirmationNumber"),
        data.get("confirmation_number"),
        data.get("confirmationNumber"),
    )
    property_name = _first_present(card_in.get("property"), data.get("property"), data.get("name"))
    dates = _first_present(card_in.get("dates"), data.get("dates"))
    room = _first_present(card_in.get("room"), data.get("room"), data.get("room_name"))
    total = _format_price(_first_present(card_in.get("total"), data.get("total")))

    card: dict[str, Any] = {
        "type": "confirmation",
        "confirmationNumber": confirmation_number,
        "property": property_name,
        "dates": dates,
        "room": room,
        "nights": _first_present(card_in.get("nights"), data.get("nights")),
        "total": total,
        "status": _first_present(card_in.get("status"), data.get("status"), default="Confirmed"),
    }

    booking_data: dict[str, Any] = {
        "confirmationNumber": confirmation_number,
        "property": property_name,
        "dates": dates,
        "room": room,
        "total": total,
    }
    # Drop keys with no value so the frontend BookingData stays clean.
    booking_data = {k: v for k, v in booking_data.items() if v is not None}

    site_action: dict[str, Any] = {
        "type": "navigate",
        "to": "confirmation",
        "data": booking_data,
    }
    return [card], site_action


def _build_upsell(
    payload: dict[str, Any], card_in: dict[str, Any], data: dict[str, Any]
) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
    """add_upsell → confirmation_update card + updateConfirmation site_action.

    Two sub-cases:
      * The agent is *offering* an add-on (user hasn't accepted): emit a
        ``upsell`` card and NO site_action (nothing changes yet).
      * The add-on was *applied*: emit a ``confirmation_update`` card and an
        ``updateConfirmation`` site_action with the new total.
    """
    card_type = card_in.get("type")
    offer = _as_dict(payload.get("offer"))

    # Pure offer (no confirmation_update produced yet).
    if card_type == "upsell" or (offer and not card_in and "updatedTotal" not in data):
        offer_card = card_in if card_type == "upsell" else offer
        card: dict[str, Any] = {
            "type": "upsell",
            "name": _first_present(offer_card.get("name"), data.get("name")),
            "description": _first_present(offer_card.get("description"), data.get("description")),
            "price": _format_price(_first_present(offer_card.get("price"), data.get("price"))),
            "priceContext": _first_present(
                offer_card.get("priceContext"), data.get("priceContext"),
                data.get("price_context"), default="",
            ),
            "cta": _first_present(offer_card.get("cta"), data.get("cta"), default="Add to Booking"),
        }
        return [card], None

    # Applied add-on → confirmation_update + updateConfirmation.
    add_on = _first_present(card_in.get("addOn"), data.get("addOn"), data.get("addon"), data.get("name"))
    add_on_price = _format_price(
        _first_present(card_in.get("addOnPrice"), data.get("addOnPrice"), data.get("addon_price"), data.get("price"))
    )
    updated_total = _format_price(
        _first_present(card_in.get("updatedTotal"), data.get("updatedTotal"), data.get("updated_total"))
    )
    confirmation_number = _first_present(
        card_in.get("confirmationNumber"),
        data.get("confirmation_number"),
        data.get("confirmationNumber"),
    )

    cards: list[dict[str, Any]] = []
    # Include the offer card too if the agent sent one alongside the update.
    if offer:
        cards.append(
            {
                "type": "upsell",
                "name": offer.get("name"),
                "description": offer.get("description"),
                "price": _format_price(offer.get("price")),
                "priceContext": _first_present(offer.get("priceContext"), default=""),
                "cta": _first_present(offer.get("cta"), default="Add to Booking"),
            }
        )

    cards.append(
        {
            "type": "confirmation_update",
            "confirmationNumber": confirmation_number,
            "addOn": add_on,
            "addOnPrice": add_on_price,
            "updatedTotal": updated_total,
            "status": _first_present(card_in.get("status"), data.get("status"), default="Updated"),
        }
    )

    site_action: dict[str, Any] = {"type": "updateConfirmation"}
    if add_on is not None:
        site_action["addOn"] = add_on
    if updated_total is not None:
        site_action["updatedTotal"] = updated_total
    return cards, site_action


def _normalise_site_action(site_action: dict[str, Any] | None) -> dict[str, Any] | None:
    """Validate ``site_action.to`` against known views; drop it if invalid."""
    if site_action is None:
        return None
    to = site_action.get("to")
    if to is not None and to not in _VALID_VIEWS:
        # Unknown view → strip the navigation target rather than misdirect.
        site_action = {k: v for k, v in site_action.items() if k != "to"}
    return site_action


# --------------------------------------------------------------------------- #
# Public entry point
# --------------------------------------------------------------------------- #
def map_structured_response(structured: dict[str, Any]) -> dict[str, Any]:
    """Convert a CXAS structured response into the frontend chat shape.

    Always returns ``{"agent_response": str, "cards": list[dict],
    "site_action": dict | None}``. Never raises on malformed/partial input — a
    response with no actionable payload yields just the agent text with empty
    cards and a null site_action.
    """
    structured = _as_dict(structured)
    agent_response: str = str(_first_present(structured.get("agent_text"), default=""))
    payload = _as_dict(structured.get("payload"))

    # An explicit payload may carry a hand-built site_action; honour it later
    # only if we don't derive a more specific one.
    explicit_site_action = _as_dict(payload.get("site_action")) or None

    action = _detect_action(payload, structured)
    card_in = _as_dict(payload.get("card"))

    cards: list[dict[str, Any]] = []
    site_action: dict[str, Any] | None = None

    if action is not None:
        data = _merged_action_args(action, payload, structured)
        if action == ACTION_SEARCH:
            cards, site_action = _build_property(card_in, data)
        elif action == ACTION_AVAILABILITY:
            cards, site_action = _build_availability(card_in, data)
        elif action == ACTION_BOOKING:
            cards, site_action = _build_booking(card_in, data)
        elif action == ACTION_UPSELL:
            cards, site_action = _build_upsell(payload, card_in, data)
        elif card_in:
            # Unknown action but a hand-built card exists — pass it through.
            cards = [card_in]
    elif card_in:
        cards = [card_in]

    # Fall back to any explicit site_action the agent attached.
    if site_action is None and explicit_site_action:
        site_action = explicit_site_action

    return {
        "agent_response": agent_response,
        "cards": cards,
        "site_action": _normalise_site_action(site_action),
    }
