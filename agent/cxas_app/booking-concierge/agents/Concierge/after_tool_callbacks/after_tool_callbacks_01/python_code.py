# pylint: disable=invalid-name,undefined-variable,unused-argument,broad-exception-caught
"""After-tool callback: surface a tool's custom 'payload' to the client.

Each concierge tool returns a dict that includes a "payload" key shaped for the
frontend (an {action, card|data} object). CES does not automatically forward a
tool's return value as a response payload, so we emit it here as a JSON Part. It
then appears in Sessions.get_structured_response(...)["payload"], which the
backend maps into the chat card + site action.
"""
import json as json_lib
from typing import Any, Optional


def after_tool_callback(
    tool: Tool,  # noqa: F821 — injected by CES at runtime
    input: dict[str, Any],
    callback_context: CallbackContext,  # noqa: F821 — injected by CES at runtime
    tool_response: dict[str, Any],
) -> Optional[dict[str, Any]]:
    """Emit tool_response['payload'] as a JSON response payload, if present."""
    try:
        result = tool_response.get("result", tool_response) if isinstance(
            tool_response, dict) else {}
        payload = result.get("payload") if isinstance(result, dict) else None
        if not payload:
            return None
        # Part is injected by CES at runtime.
        part = Part.from_json(json_lib.dumps(payload))  # noqa: F821
        # Returning Content with the payload part appends it to the turn output.
        return Content(parts=[part])  # noqa: F821
    except Exception:
        # Never break a turn because of payload emission.
        return None
