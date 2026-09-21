export type StudyUser = {
  id?: number;
  username: string;
  display_name?: string;
  role: 'admin' | 'reader';
};

export type StudyLoginResult = StudyUser & {
  token: string;
};
