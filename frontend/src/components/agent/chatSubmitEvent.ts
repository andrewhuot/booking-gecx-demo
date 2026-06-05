export const CHAT_SUBMIT_EVENT = 'booking-chat-submit';

export interface ChatSubmitEventDetail {
  text: string;
}

export function dispatchChatSubmit(text: string) {
  window.dispatchEvent(
    new CustomEvent<ChatSubmitEventDetail>(CHAT_SUBMIT_EVENT, {
      detail: { text },
    }),
  );
}
