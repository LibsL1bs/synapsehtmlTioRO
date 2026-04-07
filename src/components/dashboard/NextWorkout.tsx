import { Dumbbell, Clock, Target } from "lucide-react";

type WorkoutExercise = {
  label: string;
};

type WorkoutSummary = {
  title: string;
  statusLabel?: string;
  target?: string;
  duration?: string;
  exercises?: WorkoutExercise[];
};

interface NextWorkoutProps {
  workout?: WorkoutSummary | null;
}

export function NextWorkout({ workout }: NextWorkoutProps) {
  const hasData = Boolean(workout);

  return (
    <div className="surface-2 rounded-sm border border-border p-4 panel-shadow">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono">Próximo Treino</h3>
      </div>

      {hasData && workout && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-foreground font-mono">{workout.title || "Próximo treino"}</span>
            {workout.statusLabel && (
              <span className="text-[10px] text-alert font-mono surface-3 px-2 py-0.5 rounded-sm border border-border uppercase tracking-wider">{workout.statusLabel}</span>
            )}
          </div>

          {(workout.target || workout.duration) && (
            <div className="grid grid-cols-2 gap-3">
              {workout.target && (
                <div className="flex items-center gap-2 surface-1 rounded-sm px-2.5 py-1.5 border border-border">
                  <Target className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-secondary-foreground font-mono">{workout.target}</span>
                </div>
              )}
              {workout.duration && (
                <div className="flex items-center gap-2 surface-1 rounded-sm px-2.5 py-1.5 border border-border">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-secondary-foreground font-mono">{workout.duration}</span>
                </div>
              )}
            </div>
          )}

          {workout.exercises && workout.exercises.length > 0 && (
            <div className="border-t border-border pt-3">
              <div className="space-y-1">
                {workout.exercises.map((exercise, i) => (
                  <div key={exercise.label} className="flex items-center gap-2 px-1">
                    <span className="text-[10px] text-muted-foreground font-mono w-4">{String(i + 1).padStart(2, "0")}</span>
                    <div className="w-px h-3 bg-border" />
                    <span className="text-xs text-muted-foreground font-mono">{exercise.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
