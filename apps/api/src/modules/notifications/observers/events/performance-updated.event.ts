export class PerformanceUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly exerciseId: string,
    public readonly groupId: string,
    public readonly value: number,
    public readonly reps?: number,
    public readonly weight?: number,
  ) {}
}
