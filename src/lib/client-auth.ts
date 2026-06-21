export function redirectToSignIn(callbackUrl: string) {
  window.location.assign(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
