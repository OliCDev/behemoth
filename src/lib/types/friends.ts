export type FriendMetadata = {
  invitation: {
			token: string,
			email: string,
      accepted: boolean
		};
  admin: boolean;
    pfp: string;
    username: string;
    email: string;
    pronouns: string;
    success: string;
    error: string;
    reset_token?: string;
}

export type Friend = {
  id: string;
  username: string;
  member: string;
  pfp: string;
  admin: boolean;
  metadata: FriendMetadata;
  created_at: string;
  email: string;
};

export type Invitation = {
  id: string;
  invited_email: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  reset_token?: string;
};

export type ResetPasswordRequest = {
  email: string;
  token: string;
}
