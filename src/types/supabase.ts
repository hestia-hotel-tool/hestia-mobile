export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_participants: {
        Row: {
          chat_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string | null
          created_by_id: string
          id: string
          room_id: string | null
          ticket_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by_id: string
          id?: string
          room_id?: string | null
          ticket_id?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          created_by_id?: string
          id?: string
          room_id?: string | null
          ticket_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      consumables: {
        Row: {
          billable: boolean | null
          category: string | null
          created_at: string | null
          id: string
          name: string
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          billable?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          billable?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      consumptions: {
        Row: {
          consumable_id: string
          consumed_at: string | null
          created_at: string | null
          id: string
          quantity: number
          remarks: string | null
          reported_by_id: string
          reservation_id: string
          room_id: string
          status: string | null
          total_amount: number | null
          unit_price: number | null
        }
        Insert: {
          consumable_id: string
          consumed_at?: string | null
          created_at?: string | null
          id?: string
          quantity?: number
          remarks?: string | null
          reported_by_id: string
          reservation_id: string
          room_id: string
          status?: string | null
          total_amount?: number | null
          unit_price?: number | null
        }
        Update: {
          consumable_id?: string
          consumed_at?: string | null
          created_at?: string | null
          id?: string
          quantity?: number
          remarks?: string | null
          reported_by_id?: string
          reservation_id?: string
          room_id?: string
          status?: string | null
          total_amount?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consumptions_consumable_id_fkey"
            columns: ["consumable_id"]
            isOneToOne: false
            referencedRelation: "consumables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumptions_reported_by_id_fkey"
            columns: ["reported_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumptions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumptions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      guests: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          image_url: string | null
          updated_at: string | null
          vip_code: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          image_url?: string | null
          updated_at?: string | null
          vip_code?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          image_url?: string | null
          updated_at?: string | null
          vip_code?: string | null
        }
        Relationships: []
      }
      lost_and_found_items: {
        Row: {
          created_at: string | null
          description: string | null
          found_at: string | null
          found_by_id: string
          found_location: string | null
          id: string
          item_name: string
          image_url: string | null
          notes: string | null
          registered_by_id: string
          reservation_id: string | null
          return_info: string | null
          room_id: string | null
          status: string | null
          storage_location: string | null
          ticket_id: string | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          found_at?: string | null
          found_by_id: string
          found_location?: string | null
          id?: string
          item_name: string
          image_url?: string | null
          notes?: string | null
          registered_by_id?: string
          reservation_id?: string | null
          return_info?: string | null
          room_id?: string | null
          status?: string | null
          storage_location?: string | null
          ticket_id?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          found_at?: string | null
          found_by_id?: string
          found_location?: string | null
          id?: string
          item_name?: string
          image_url?: string | null
          notes?: string | null
          registered_by_id?: string
          reservation_id?: string | null
          return_info?: string | null
          room_id?: string | null
          status?: string | null
          storage_location?: string | null
          ticket_id?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lost_and_found_items_found_by_id_fkey"
            columns: ["found_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_and_found_items_registered_by_id_fkey"
            columns: ["registered_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_and_found_items_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_and_found_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_and_found_items_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string | null
          id: string
          room_assignment_id: string | null
          sender_id: string
          type: string
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          room_assignment_id?: string | null
          sender_id: string
          type?: string
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          room_assignment_id?: string | null
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_room_assignment_id_fkey"
            columns: ["room_assignment_id"]
            isOneToOne: false
            referencedRelation: "room_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      reservation_guests: {
        Row: {
          guest_id: string
          reservation_id: string
        }
        Insert: {
          guest_id: string
          reservation_id: string
        }
        Update: {
          guest_id?: string
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_guests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_guests_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          adults: number | null
          arrival_date: string
          created_at: string | null
          departure_date: string
          eta: string | null
          front_office_status: string | null
          id: string
          kids: number | null
          promised_time: string | null
          reservation_status: string | null
          room_id: string
          updated_at: string | null
        }
        Insert: {
          adults?: number | null
          arrival_date: string
          created_at?: string | null
          departure_date: string
          eta?: string | null
          front_office_status?: string | null
          id?: string
          kids?: number | null
          promised_time?: string | null
          reservation_status?: string | null
          room_id: string
          updated_at?: string | null
        }
        Update: {
          adults?: number | null
          arrival_date?: string
          created_at?: string | null
          departure_date?: string
          eta?: string | null
          front_office_status?: string | null
          id?: string
          kids?: number | null
          promised_time?: string | null
          reservation_status?: string | null
          room_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      room_assignments: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string
          pause_reason: string | null
          refuse_reason: string | null
          room_id: string
          shift_id: string
          start_time: string | null
          updated_at: string | null
          user_id: string
          work_status: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          pause_reason?: string | null
          refuse_reason?: string | null
          room_id: string
          shift_id: string
          start_time?: string | null
          updated_at?: string | null
          user_id: string
          work_status?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          pause_reason?: string | null
          refuse_reason?: string | null
          room_id?: string
          shift_id?: string
          start_time?: string | null
          updated_at?: string | null
          user_id?: string
          work_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      room_history: {
        Row: {
          attachments: Json | null
          created_at: string | null
          description: string | null
          event_id: string | null
          event_type: string
          guest_id: string | null
          id: string
          reservation_id: string | null
          room_id: string
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          event_type: string
          guest_id?: string | null
          id?: string
          reservation_id?: string | null
          room_id: string
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          event_type?: string
          guest_id?: string | null
          id?: string
          reservation_id?: string | null
          room_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_history_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_history_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_history_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      room_notes: {
        Row: {
          id: string
          room_id: string
          created_by_id: string | null
          text: string
          created_at: string | null
        }
        Insert: {
          id?: string
          room_id: string
          created_by_id?: string | null
          text: string
          created_at?: string | null
        }
        Update: {
          id?: string
          room_id?: string
          created_by_id?: string | null
          text?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_notes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_notes_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          category: string | null
          created_at: string | null
          credit: number | null
          flagged: boolean | null
          house_keeping_status: string | null
          id: string
          linen_status: string | null
          priority: string | null
          room_number: string
          special_instructions: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          credit?: number | null
          flagged?: boolean | null
          house_keeping_status?: string | null
          id?: string
          linen_status?: string | null
          priority?: string | null
          room_number: string
          special_instructions?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          credit?: number | null
          flagged?: boolean | null
          house_keeping_status?: string | null
          id?: string
          linen_status?: string | null
          priority?: string | null
          room_number?: string
          special_instructions?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          name: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          name: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          name?: string
          start_time?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assigned_to_id: string | null
          created_at: string | null
          created_by_id: string
          department_id: string | null
          description: string | null
          id: string
          priority: string | null
          resolved_at: string | null
          room_assignment_id: string | null
          room_id: string | null
          status: string
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to_id?: string | null
          created_at?: string | null
          created_by_id: string
          department_id?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          resolved_at?: string | null
          room_assignment_id?: string | null
          room_id?: string | null
          status: string
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to_id?: string | null
          created_at?: string | null
          created_by_id?: string
          department_id?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          resolved_at?: string | null
          room_assignment_id?: string | null
          room_id?: string | null
          status?: string
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_room_assignment_id_fkey"
            columns: ["room_assignment_id"]
            isOneToOne: false
            referencedRelation: "room_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department_id: string | null
          full_name: string
          id: string
          role_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          full_name: string
          id: string
          role_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          full_name?: string
          id?: string
          role_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tags: {
        Row: {
          created_at: string
          id: string
          tagged_by_id: string | null
          tagged_user_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tagged_by_id?: string | null
          tagged_user_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tagged_by_id?: string | null
          tagged_user_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tags_tagged_by_id_fkey"
            columns: ["tagged_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tags_tagged_user_id_fkey"
            columns: ["tagged_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tags_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_tokens: {
        Row: {
          created_at: string
          device_name: string | null
          device_os: string | null
          expo_push_token: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          device_os?: string | null
          expo_push_token: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          device_os?: string | null
          expo_push_token?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
