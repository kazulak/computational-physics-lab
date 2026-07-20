/**
 * Decouples the rendering clock from the physics integration clock.
 * Accumulates real elapsed time, scales it by playback speed,
 * and determines the number of fixed physics integration steps to take.
 */
export class SimulationClock {
  private accumulator = 0;
  private maxCatchUpSteps = 10;

  constructor(
    public physicsDtSec: number,
    public playbackSpeed: number
  ) {}

  /**
   * Updates the clock with the real elapsed wall time in seconds.
   * Returns the number of physics integration steps that must be run.
   */
  update(realElapsedTimeSec: number): number {
    // Accumulate the elapsed time scaled by the playback speed multiplier
    this.accumulator += realElapsedTimeSec * this.playbackSpeed;

    // Prevent browser freezing or "spiral of death" after long lags
    const maxAccumulatedTime = this.physicsDtSec * this.maxCatchUpSteps;
    if (this.accumulator > maxAccumulatedTime) {
      this.accumulator = maxAccumulatedTime;
    }

    let steps = 0;
    while (this.accumulator >= this.physicsDtSec) {
      this.accumulator -= this.physicsDtSec;
      steps++;
    }

    return steps;
  }

  /**
   * Resets the accumulated leftover time back to zero.
   */
  reset(): void {
    this.accumulator = 0;
  }
}
