-- Add missing RLS policies for nutrition tables
-- These were enabled but had no policies defined, causing 403/406 errors

-- Nutrition Logs: Clients can manage their own, trainers can view/manage their clients'
CREATE POLICY "Clients can view own nutrition logs" ON nutrition_logs
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert own nutrition logs" ON nutrition_logs
    FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own nutrition logs" ON nutrition_logs
    FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete own nutrition logs" ON nutrition_logs
    FOR DELETE USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view client nutrition logs" ON nutrition_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM client_profiles
            WHERE client_profiles.id = nutrition_logs.client_id
            AND client_profiles.trainer_id = auth.uid()
        )
    );

CREATE POLICY "Trainers can insert client nutrition logs" ON nutrition_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM client_profiles
            WHERE client_profiles.id = nutrition_logs.client_id
            AND client_profiles.trainer_id = auth.uid()
        )
    );

CREATE POLICY "Trainers can update client nutrition logs" ON nutrition_logs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM client_profiles
            WHERE client_profiles.id = nutrition_logs.client_id
            AND client_profiles.trainer_id = auth.uid()
        )
    );

-- Nutrition Entries: Follow the parent log's permissions
CREATE POLICY "View nutrition entries for accessible logs" ON nutrition_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM nutrition_logs
            WHERE nutrition_logs.id = nutrition_entries.log_id
            AND (
                nutrition_logs.client_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM client_profiles
                    WHERE client_profiles.id = nutrition_logs.client_id
                    AND client_profiles.trainer_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Insert nutrition entries for accessible logs" ON nutrition_entries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM nutrition_logs
            WHERE nutrition_logs.id = nutrition_entries.log_id
            AND (
                nutrition_logs.client_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM client_profiles
                    WHERE client_profiles.id = nutrition_logs.client_id
                    AND client_profiles.trainer_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Update nutrition entries for accessible logs" ON nutrition_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM nutrition_logs
            WHERE nutrition_logs.id = nutrition_entries.log_id
            AND (
                nutrition_logs.client_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM client_profiles
                    WHERE client_profiles.id = nutrition_logs.client_id
                    AND client_profiles.trainer_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Delete nutrition entries for accessible logs" ON nutrition_entries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM nutrition_logs
            WHERE nutrition_logs.id = nutrition_entries.log_id
            AND (
                nutrition_logs.client_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM client_profiles
                    WHERE client_profiles.id = nutrition_logs.client_id
                    AND client_profiles.trainer_id = auth.uid()
                )
            )
        )
    );

-- Nutrition Targets: Clients can view their own, trainers can manage their clients'
CREATE POLICY "Clients can view own nutrition targets" ON nutrition_targets
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view client nutrition targets" ON nutrition_targets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM client_profiles
            WHERE client_profiles.id = nutrition_targets.client_id
            AND client_profiles.trainer_id = auth.uid()
        )
    );

CREATE POLICY "Trainers can manage client nutrition targets" ON nutrition_targets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM client_profiles
            WHERE client_profiles.id = nutrition_targets.client_id
            AND client_profiles.trainer_id = auth.uid()
        )
    );

-- Foods: Everyone can read (system database), authenticated users can insert custom foods
CREATE POLICY "Everyone can view foods" ON foods
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert foods" ON foods
    FOR INSERT TO authenticated WITH CHECK (true);
