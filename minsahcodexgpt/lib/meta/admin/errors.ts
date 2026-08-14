export class MetaAdminActionError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = 'META_ADMIN_ACTION_ERROR'
  ) {
    super(message);
  }
}
