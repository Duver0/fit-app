export enum UserRole {
  USER = 'USER',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum GroupMemberRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

export enum ExerciseUnit {
  KG = 'KG',
  REPS = 'REPS',
  MIN = 'MIN',
  SEC = 'SEC',
  M = 'M',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
