export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      client_profiles: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          fitness_level: string | null
          gender: string | null
          goals: string[] | null
          height_inches: number | null
          id: string
          injuries_notes: string | null
          onboarding_completed: boolean | null
          stripe_customer_id: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          trainer_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          fitness_level?: string | null
          gender?: string | null
          goals?: string[] | null
          height_inches?: number | null
          id: string
          injuries_notes?: string | null
          onboarding_completed?: boolean | null
          stripe_customer_id?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          trainer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          fitness_level?: string | null
          gender?: string | null
          goals?: string[] | null
          height_inches?: number | null
          id?: string
          injuries_notes?: string | null
          onboarding_completed?: boolean | null
          stripe_customer_id?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          trainer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profiles_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: Database["public"]["Enums"]["exercise_category"]
          created_at: string | null
          created_by: string | null
          description: string | null
          embedding: string | null
          equipment: string[] | null
          id: string
          instructions: string | null
          is_system: boolean | null
          name: string
          primary_muscle: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          thumbnail_url: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["exercise_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          embedding?: string | null
          equipment?: string[] | null
          id?: string
          instructions?: string | null
          is_system?: boolean | null
          name: string
          primary_muscle: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles?:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["exercise_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          embedding?: string | null
          equipment?: string[] | null
          id?: string
          instructions?: string | null
          is_system?: boolean | null
          name?: string
          primary_muscle?: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles?:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          brand: string | null
          calories: number | null
          carbs_g: number | null
          created_at: string | null
          embedding: string | null
          fat_g: number | null
          fdc_id: number | null
          fiber_g: number | null
          id: string
          is_verified: boolean | null
          name: string
          protein_g: number | null
          serving_size: number | null
          serving_unit: string | null
          sodium_mg: number | null
          sugar_g: number | null
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          embedding?: string | null
          fat_g?: number | null
          fdc_id?: number | null
          fiber_g?: number | null
          id?: string
          is_verified?: boolean | null
          name: string
          protein_g?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          sodium_mg?: number | null
          sugar_g?: number | null
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          embedding?: string | null
          fat_g?: number | null
          fdc_id?: number | null
          fiber_g?: number | null
          id?: string
          is_verified?: boolean | null
          name?: string
          protein_g?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          sodium_mg?: number | null
          sugar_g?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string | null
          currency: string | null
          due_date: string | null
          id: string
          paid_at: string | null
          status: string | null
          stripe_invoice_id: string | null
          subscription_id: string | null
          trainer_id: string
        }
        Insert: {
          amount_cents: number
          client_id: string
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          trainer_id: string
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          client_id: string
          custom_label: string | null
          id: string
          measured_at: string | null
          measurement_type: Database["public"]["Enums"]["measurement_type"]
          notes: string | null
          unit: string
          value: number
        }
        Insert: {
          client_id: string
          custom_label?: string | null
          id?: string
          measured_at?: string | null
          measurement_type: Database["public"]["Enums"]["measurement_type"]
          notes?: string | null
          unit: string
          value: number
        }
        Update: {
          client_id?: string
          custom_label?: string | null
          id?: string
          measured_at?: string | null
          measurement_type?: Database["public"]["Enums"]["measurement_type"]
          notes?: string | null
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_entries: {
        Row: {
          calories: number | null
          carbs_g: number | null
          custom_name: string | null
          fat_g: number | null
          food_id: string | null
          id: string
          log_id: string
          logged_at: string | null
          meal_type: string | null
          protein_g: number | null
          servings: number | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          custom_name?: string | null
          fat_g?: number | null
          food_id?: string | null
          id?: string
          log_id: string
          logged_at?: string | null
          meal_type?: string | null
          protein_g?: number | null
          servings?: number | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          custom_name?: string | null
          fat_g?: number | null
          food_id?: string | null
          id?: string
          log_id?: string
          logged_at?: string | null
          meal_type?: string | null
          protein_g?: number | null
          servings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_entries_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "nutrition_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_logs: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          log_date: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          log_date: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          log_date?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_targets: {
        Row: {
          calories_target: number | null
          carbs_target_g: number | null
          client_id: string
          created_at: string | null
          created_by: string | null
          effective_from: string
          effective_to: string | null
          fat_target_g: number | null
          id: string
          notes: string | null
          protein_target_g: number | null
        }
        Insert: {
          calories_target?: number | null
          carbs_target_g?: number | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          fat_target_g?: number | null
          id?: string
          notes?: string | null
          protein_target_g?: number | null
        }
        Update: {
          calories_target?: number | null
          carbs_target_g?: number | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          fat_target_g?: number | null
          id?: string
          notes?: string | null
          protein_target_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_targets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          timezone: string | null
          units_system: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          units_system?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          units_system?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          client_id: string
          id: string
          notes: string | null
          photo_type: string | null
          storage_path: string
          taken_at: string | null
        }
        Insert: {
          client_id: string
          id?: string
          notes?: string | null
          photo_type?: string | null
          storage_path: string
          taken_at?: string | null
        }
        Update: {
          client_id?: string
          id?: string
          notes?: string | null
          photo_type?: string | null
          storage_path?: string
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_cents: number
          cancel_at_period_end: boolean | null
          client_id: string
          created_at: string | null
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          interval: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trainer_id: string
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          cancel_at_period_end?: boolean | null
          client_id: string
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          interval?: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trainer_id: string
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          cancel_at_period_end?: boolean | null
          client_id?: string
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          interval?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trainer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_profiles: {
        Row: {
          bio: string | null
          business_name: string | null
          certifications: string[] | null
          created_at: string | null
          id: string
          max_clients: number | null
          specializations: string[] | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          subscription_ends_at: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          business_name?: string | null
          certifications?: string[] | null
          created_at?: string | null
          id: string
          max_clients?: number | null
          specializations?: string[] | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          subscription_ends_at?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          business_name?: string | null
          certifications?: string[] | null
          created_at?: string | null
          id?: string
          max_clients?: number | null
          specializations?: string[] | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          subscription_ends_at?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainer_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wearable_connections: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          provider: string
          terra_user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          provider: string
          terra_user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          provider?: string
          terra_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wearable_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wearable_daily_data: {
        Row: {
          active_minutes: number | null
          client_id: string
          data_date: string
          hrv_avg: number | null
          id: string
          raw_data: Json | null
          resting_heart_rate: number | null
          sleep_deep_minutes: number | null
          sleep_duration_minutes: number | null
          sleep_efficiency: number | null
          sleep_rem_minutes: number | null
          steps: number | null
          synced_at: string | null
        }
        Insert: {
          active_minutes?: number | null
          client_id: string
          data_date: string
          hrv_avg?: number | null
          id?: string
          raw_data?: Json | null
          resting_heart_rate?: number | null
          sleep_deep_minutes?: number | null
          sleep_duration_minutes?: number | null
          sleep_efficiency?: number | null
          sleep_rem_minutes?: number | null
          steps?: number | null
          synced_at?: string | null
        }
        Update: {
          active_minutes?: number | null
          client_id?: string
          data_date?: string
          hrv_avg?: number | null
          id?: string
          raw_data?: Json | null
          resting_heart_rate?: number | null
          sleep_deep_minutes?: number | null
          sleep_duration_minutes?: number | null
          sleep_efficiency?: number | null
          sleep_rem_minutes?: number | null
          steps?: number | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wearable_daily_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          prescribed_duration_seconds: number | null
          prescribed_reps_max: number | null
          prescribed_reps_min: number | null
          prescribed_sets: number | null
          prescribed_weight: number | null
          rest_seconds: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          notes?: string | null
          order_index: number
          prescribed_duration_seconds?: number | null
          prescribed_reps_max?: number | null
          prescribed_reps_min?: number | null
          prescribed_sets?: number | null
          prescribed_weight?: number | null
          rest_seconds?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          prescribed_duration_seconds?: number | null
          prescribed_reps_max?: number | null
          prescribed_reps_min?: number | null
          prescribed_sets?: number | null
          prescribed_weight?: number | null
          rest_seconds?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          completed_at: string | null
          duration_seconds: number | null
          id: string
          notes: string | null
          reps_completed: number | null
          rpe: number | null
          set_number: number
          weight_used: number | null
          workout_exercise_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          reps_completed?: number | null
          rpe?: number | null
          set_number: number
          weight_used?: number | null
          workout_exercise_id: string
        }
        Update: {
          completed_at?: string | null
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          reps_completed?: number | null
          rpe?: number | null
          set_number?: number
          weight_used?: number | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template_exercises: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          reps_max: number | null
          reps_min: number | null
          rest_seconds: number | null
          sets: number | null
          template_id: string
          weight_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          order_index: number
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets?: number | null
          template_id: string
          weight_percentage?: number | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds?: number | null
          sets?: number | null
          template_id?: string
          weight_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          is_public: boolean | null
          name: string
          tags: string[] | null
          trainer_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_public?: boolean | null
          name: string
          tags?: string[] | null
          trainer_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_public?: boolean | null
          name?: string
          tags?: string[] | null
          trainer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          rating: number | null
          scheduled_date: string | null
          scheduled_time: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["workout_status"] | null
          template_id: string | null
          trainer_id: string | null
          trainer_notes: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          rating?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workout_status"] | null
          template_id?: string | null
          trainer_id?: string | null
          trainer_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          rating?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workout_status"] | null
          template_id?: string | null
          trainer_id?: string | null
          trainer_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      exercise_category:
        | "strength"
        | "cardio"
        | "flexibility"
        | "balance"
        | "plyometric"
      measurement_type:
        | "weight"
        | "body_fat"
        | "chest"
        | "waist"
        | "hips"
        | "thigh"
        | "arm"
        | "custom"
      muscle_group:
        | "chest"
        | "back"
        | "shoulders"
        | "biceps"
        | "triceps"
        | "forearms"
        | "core"
        | "quads"
        | "hamstrings"
        | "glutes"
        | "calves"
        | "full_body"
      subscription_status: "active" | "past_due" | "canceled" | "trialing"
      user_role: "trainer" | "client" | "admin"
      workout_status: "scheduled" | "in_progress" | "completed" | "skipped"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      exercise_category: [
        "strength",
        "cardio",
        "flexibility",
        "balance",
        "plyometric",
      ],
      measurement_type: [
        "weight",
        "body_fat",
        "chest",
        "waist",
        "hips",
        "thigh",
        "arm",
        "custom",
      ],
      muscle_group: [
        "chest",
        "back",
        "shoulders",
        "biceps",
        "triceps",
        "forearms",
        "core",
        "quads",
        "hamstrings",
        "glutes",
        "calves",
        "full_body",
      ],
      subscription_status: ["active", "past_due", "canceled", "trialing"],
      user_role: ["trainer", "client", "admin"],
      workout_status: ["scheduled", "in_progress", "completed", "skipped"],
    },
  },
} as const

