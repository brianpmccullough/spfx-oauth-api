export interface MeResponseDto {
  upn: string | null;
  name: string | null;
  /** The caller's own access token, echoed back for debugging. */
  bearerToken: string;
}
