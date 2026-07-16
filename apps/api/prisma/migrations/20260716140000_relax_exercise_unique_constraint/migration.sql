-- Drop the existing unique constraint on (group_id, name)
DROP INDEX IF EXISTS "exercises_group_id_name_key";

-- Create a new unique constraint on (group_id, name, unit)
-- allowing the same exercise name with different units
CREATE UNIQUE INDEX "exercises_group_id_name_unit_key" ON "exercises"("group_id", "name", "unit");
