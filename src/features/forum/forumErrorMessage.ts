import { asApiError } from '../../api/apiError';

/** What the user was trying to publish, so the message can name it. */
export type ForumAction = 'post' | 'comment' | 'forum';

type Translate = (key: string, defaultValue: string) => string;

/**
 * Turns a rejected forum thunk into a message that says what actually went wrong.
 *
 * The dialogs used to test `error.message.includes('422')`, but `unwrap()` throws a serialized
 * object whose message is Axios' "Request failed with status code …" — so every failure, from a
 * moderation rejection to an expired session, showed the same generic "could not publish".
 */
export const forumErrorMessage = (t: Translate, error: unknown, action: ForumAction): string => {
  const { status, code, message } = asApiError(error);

  if (code === 'MODERATION_REJECTED' || status === 422) {
    const rejected = action === 'comment'
      ? t('forums.commentRejected', 'Your comment was rejected by moderation.')
      : action === 'forum'
        ? t('forums.moderationRejected', 'Your forum was rejected by moderation. Please revise the name/description.')
        : t('forums.postRejected', 'Your post was rejected by moderation.');
    // The backend explains which policy tripped; showing it lets the author fix the text.
    return message ? `${rejected} (${message})` : rejected;
  }

  if (status === 401 || code === 'UNAUTHENTICATED') {
    return t('forums.errUnauthenticated', 'Your session expired. Sign in again to publish.');
  }
  if (status === 403) {
    return t('forums.errForbidden', "You don't have permission to publish here.");
  }
  if (status === 404) {
    return action === 'comment'
      ? t('forums.errPostGone', 'That post no longer exists.')
      : t('forums.errForumGone', 'That forum no longer exists.');
  }
  if (status === 400 || code === 'VALIDATION_FAILED') {
    const invalid = t('forums.errValidation', 'Check the content — something is empty or too long.');
    return message ? `${invalid} (${message})` : invalid;
  }
  if (status === 429) {
    return t('forums.errRateLimited', "You're posting too fast. Wait a moment and try again.");
  }
  if (status === null) {
    return t('forums.errNetwork', "Couldn't reach the server. Check your connection and try again.");
  }
  return t('forums.postError', 'Could not publish. Try again.');
};
