export function handleFavoriteClick<TChat>({
  chat,
  isSignedIn,
  onNavigate,
  onSignIn,
  toggleFavorite,
}: {
  readonly chat: TChat;
  readonly isSignedIn: boolean;
  readonly onNavigate?: () => void;
  readonly onSignIn?: () => void;
  readonly toggleFavorite: (chat: TChat) => void;
}) {
  if (!isSignedIn) {
    onSignIn?.();
    onNavigate?.();
    return;
  }

  toggleFavorite(chat);
}
