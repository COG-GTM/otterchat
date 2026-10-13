export function handleFavoriteClick<TChat>({
  chat,
  isSignedIn,
  onSignIn,
  toggleFavorite,
}: {
  readonly chat: TChat;
  readonly isSignedIn: boolean;
  readonly onSignIn: () => void;
  readonly toggleFavorite: (chat: TChat) => void | Promise<void>;
}) {
  if (!isSignedIn) {
    onSignIn();
    return;
  }

  return toggleFavorite(chat);
}
