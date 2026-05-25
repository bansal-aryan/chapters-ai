export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          school_name: string | null;
          student_level: "high_school" | "college" | "other" | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          school_name?: string | null;
          student_level?: "high_school" | "college" | "other" | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          user_id: string;
          source: "canvas" | "manual";
          name: string;
          code: string | null;
          term: string | null;
          color: string;
          canvas_course_id: string | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: "canvas" | "manual";
          name: string;
          code?: string | null;
          term?: string | null;
          color?: string;
          canvas_course_id?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
        Relationships: [];
      };
      assignments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          source: "canvas" | "manual";
          canvas_assignment_id: string | null;
          title: string;
          description: string;
          summary: string;
          due_at: string | null;
          status: "not_started" | "in_progress" | "submitted" | "graded" | "missing";
          estimated_effort_minutes: number;
          priority_override: number | null;
          metadata: Json;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          source: "canvas" | "manual";
          canvas_assignment_id?: string | null;
          title: string;
          description?: string;
          summary?: string;
          due_at?: string | null;
          status?: "not_started" | "in_progress" | "submitted" | "graded" | "missing";
          estimated_effort_minutes?: number;
          priority_override?: number | null;
          metadata?: Json;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assignments"]["Insert"]>;
        Relationships: [];
      };
      file_resources: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          source: "canvas" | "manual";
          canvas_file_id: string | null;
          title: string;
          type: "pdf" | "doc" | "image" | "link";
          summary: string;
          citation: string;
          storage_path: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          source: "canvas" | "manual";
          canvas_file_id?: string | null;
          title: string;
          type: "pdf" | "doc" | "image" | "link";
          summary?: string;
          citation?: string;
          storage_path?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["file_resources"]["Insert"]>;
        Relationships: [];
      };
      assignment_file_resources: {
        Row: {
          assignment_id: string;
          file_resource_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          assignment_id: string;
          file_resource_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assignment_file_resources"]["Insert"]>;
        Relationships: [];
      };
      assignment_relations: {
        Row: {
          assignment_id: string;
          related_assignment_id: string;
          user_id: string;
          relation_type: string;
          score: number;
          created_at: string;
        };
        Insert: {
          assignment_id: string;
          related_assignment_id: string;
          user_id: string;
          relation_type?: string;
          score?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assignment_relations"]["Insert"]>;
        Relationships: [];
      };
      study_blocks: {
        Row: {
          id: string;
          user_id: string;
          assignment_id: string | null;
          title: string;
          starts_at: string;
          ends_at: string;
          locked_by_user: boolean;
          source: "ai" | "manual";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assignment_id?: string | null;
          title: string;
          starts_at: string;
          ends_at: string;
          locked_by_user?: boolean;
          source?: "ai" | "manual";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["study_blocks"]["Insert"]>;
        Relationships: [];
      };
      manual_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          cadence: string | null;
          starts_at: string;
          ends_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          cadence?: string | null;
          starts_at: string;
          ends_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["manual_events"]["Insert"]>;
        Relationships: [];
      };
      chat_threads: {
        Row: {
          id: string;
          user_id: string;
          scope: "global" | "class" | "assignment";
          course_id: string | null;
          assignment_id: string | null;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          scope: "global" | "class" | "assignment";
          course_id?: string | null;
          assignment_id?: string | null;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_threads"]["Insert"]>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          thread_id: string;
          role: "assistant" | "user" | "system";
          content: string;
          citation_resource_ids: string[];
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          thread_id: string;
          role: "assistant" | "user" | "system";
          content: string;
          citation_resource_ids?: string[];
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
        Relationships: [];
      };
      search_chunks: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          assignment_id: string | null;
          file_resource_id: string | null;
          source_type: "assignment" | "file" | "module" | "note";
          title: string;
          content: string;
          summary: string;
          citation: string;
          content_tsv: string | null;
          embedding: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          assignment_id?: string | null;
          file_resource_id?: string | null;
          source_type: "assignment" | "file" | "module" | "note";
          title: string;
          content: string;
          summary?: string;
          citation?: string;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["search_chunks"]["Insert"]>;
        Relationships: [];
      };
      canvas_connections: {
        Row: {
          id: string;
          user_id: string;
          canvas_domain: string;
          canvas_user_id: string | null;
          status: "pending" | "connected" | "expired" | "revoked" | "error";
          token_reference: string | null;
          scopes: string[];
          last_synced_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_domain: string;
          canvas_user_id?: string | null;
          status?: "pending" | "connected" | "expired" | "revoked" | "error";
          token_reference?: string | null;
          scopes?: string[];
          last_synced_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["canvas_connections"]["Insert"]>;
        Relationships: [];
      };
      student_contexts: {
        Row: {
          user_id: string;
          goals: string;
          learning_preferences: Json;
          constraints: string;
          ai_notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          goals?: string;
          learning_preferences?: Json;
          constraints?: string;
          ai_notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_contexts"]["Insert"]>;
        Relationships: [];
      };
      calendar_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: "google";
          account_email: string | null;
          status: "pending" | "connected" | "expired" | "revoked" | "error";
          token_reference: string | null;
          scopes: string[];
          last_synced_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: "google";
          account_email?: string | null;
          status?: "pending" | "connected" | "expired" | "revoked" | "error";
          token_reference?: string | null;
          scopes?: string[];
          last_synced_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["calendar_connections"]["Insert"]>;
        Relationships: [];
      };
      sync_runs: {
        Row: {
          id: string;
          user_id: string;
          provider: "canvas" | "google_calendar";
          status: "queued" | "running" | "succeeded" | "failed";
          started_at: string | null;
          finished_at: string | null;
          summary: string;
          error_message: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: "canvas" | "google_calendar";
          status?: "queued" | "running" | "succeeded" | "failed";
          started_at?: string | null;
          finished_at?: string | null;
          summary?: string;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sync_runs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_workspace_text: {
        Args: {
          search_query: string;
          match_count?: number;
          filter_course_id?: string | null;
        };
        Returns: Array<{
          id: string;
          course_id: string | null;
          assignment_id: string | null;
          file_resource_id: string | null;
          source_type: string;
          title: string;
          summary: string;
          citation: string;
          content: string;
          relevance: number;
        }>;
      };
      match_search_chunks: {
        Args: {
          query_embedding: string;
          match_count?: number;
          filter_course_id?: string | null;
        };
        Returns: Array<{
          id: string;
          course_id: string | null;
          assignment_id: string | null;
          file_resource_id: string | null;
          source_type: string;
          title: string;
          summary: string;
          citation: string;
          content: string;
          relevance: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
