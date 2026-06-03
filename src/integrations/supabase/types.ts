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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_clicks: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          reward_granted: number
          user_id: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          reward_granted?: number
          user_id: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          reward_granted?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_connections: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          body: string | null
          created_at: string
          cta_text: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          placement: string
          reward_swipes: number
          starts_at: string | null
          title: string
          updated_at: string
          video_url: string | null
          weight: number
        }
        Insert: {
          body?: string | null
          created_at?: string
          cta_text?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          placement?: string
          reward_swipes?: number
          starts_at?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          weight?: number
        }
        Update: {
          body?: string | null
          created_at?: string
          cta_text?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          placement?: string
          reward_swipes?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          weight?: number
        }
        Relationships: []
      }
      connection_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          match_id: string
          message: string | null
          resolved_at: string | null
          status: string
          target_id: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          match_id: string
          message?: string | null
          resolved_at?: string | null
          status?: string
          target_id: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          match_id?: string
          message?: string | null
          resolved_at?: string | null
          status?: string
          target_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          html: string
          id: string
          is_active: boolean
          key: string
          subject: string
          updated_at: string
        }
        Insert: {
          html: string
          id?: string
          is_active?: boolean
          key: string
          subject: string
          updated_at?: string
        }
        Update: {
          html?: string
          id?: string
          is_active?: boolean
          key?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          match_id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          match_id: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          match_id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      mpesa_packages: {
        Row: {
          amount: number
          created_at: string
          daily_swipe_limit: number | null
          description: string | null
          duration_days: number
          features: string[] | null
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          daily_swipe_limit?: number | null
          description?: string | null
          duration_days?: number
          features?: string[] | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          daily_swipe_limit?: number | null
          description?: string | null
          duration_days?: number
          features?: string[] | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      mpesa_payments: {
        Row: {
          amount: number
          checkout_request_id: string | null
          created_at: string
          duration_days: number
          id: string
          merchant_request_id: string | null
          package_id: string | null
          phone: string
          raw_response: Json | null
          result_code: string | null
          result_desc: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          created_at?: string
          duration_days?: number
          id?: string
          merchant_request_id?: string | null
          package_id?: string | null
          phone: string
          raw_response?: Json | null
          result_code?: string | null
          result_desc?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          created_at?: string
          duration_days?: number
          id?: string
          merchant_request_id?: string | null
          package_id?: string | null
          phone?: string
          raw_response?: Json | null
          result_code?: string | null
          result_desc?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mpesa_settings: {
        Row: {
          account_reference: string
          amount: number
          consumer_key: string | null
          consumer_secret: string | null
          description: string
          environment: string
          id: number
          is_active: boolean
          pass_key: string | null
          shortcode: string | null
          updated_at: string
        }
        Insert: {
          account_reference?: string
          amount?: number
          consumer_key?: string | null
          consumer_secret?: string | null
          description?: string
          environment?: string
          id?: number
          is_active?: boolean
          pass_key?: string | null
          shortcode?: string | null
          updated_at?: string
        }
        Update: {
          account_reference?: string
          amount?: number
          consumer_key?: string | null
          consumer_secret?: string | null
          description?: string
          environment?: string
          id?: number
          is_active?: boolean
          pass_key?: string | null
          shortcode?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string | null
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          purpose: string
          used_at: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          purpose?: string
          used_at?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          purpose?: string
          used_at?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      premium_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          label: string
          moderator_user_id: string | null
          notes: string | null
          phone: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          label: string
          moderator_user_id?: string | null
          notes?: string | null
          phone?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          label?: string
          moderator_user_id?: string | null
          notes?: string | null
          phone?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      premium_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          plan: string
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan?: string
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan?: string
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          age_group: string | null
          bio: string | null
          bonus_swipes: number
          city: string | null
          conditions: string[] | null
          country: string | null
          created_at: string
          display_name: string
          drinking: string | null
          education: string | null
          email: string | null
          ethnicity: string | null
          financial_status: string | null
          gender: string | null
          has_children: string | null
          height_cm: number | null
          id: string
          interested_in: string | null
          interests: string[] | null
          is_active: boolean
          is_premium: boolean
          is_simulated: boolean
          languages: string[] | null
          latitude: number | null
          location_city: string | null
          location_country: string | null
          location_updated_at: string | null
          longitude: number | null
          orientation: string | null
          phone: string | null
          photos: string[] | null
          preferred_age_max: number | null
          preferred_age_min: number | null
          preferred_countries: string[] | null
          preferred_ethnicities: string[] | null
          preferred_genders: string[] | null
          preferred_orientations: string[] | null
          preferred_relationship_goals: string[] | null
          preferred_religions: string[] | null
          relationship_goals: string | null
          religion: string | null
          smoking: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          age_group?: string | null
          bio?: string | null
          bonus_swipes?: number
          city?: string | null
          conditions?: string[] | null
          country?: string | null
          created_at?: string
          display_name: string
          drinking?: string | null
          education?: string | null
          email?: string | null
          ethnicity?: string | null
          financial_status?: string | null
          gender?: string | null
          has_children?: string | null
          height_cm?: number | null
          id: string
          interested_in?: string | null
          interests?: string[] | null
          is_active?: boolean
          is_premium?: boolean
          is_simulated?: boolean
          languages?: string[] | null
          latitude?: number | null
          location_city?: string | null
          location_country?: string | null
          location_updated_at?: string | null
          longitude?: number | null
          orientation?: string | null
          phone?: string | null
          photos?: string[] | null
          preferred_age_max?: number | null
          preferred_age_min?: number | null
          preferred_countries?: string[] | null
          preferred_ethnicities?: string[] | null
          preferred_genders?: string[] | null
          preferred_orientations?: string[] | null
          preferred_relationship_goals?: string[] | null
          preferred_religions?: string[] | null
          relationship_goals?: string | null
          religion?: string | null
          smoking?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          age_group?: string | null
          bio?: string | null
          bonus_swipes?: number
          city?: string | null
          conditions?: string[] | null
          country?: string | null
          created_at?: string
          display_name?: string
          drinking?: string | null
          education?: string | null
          email?: string | null
          ethnicity?: string | null
          financial_status?: string | null
          gender?: string | null
          has_children?: string | null
          height_cm?: number | null
          id?: string
          interested_in?: string | null
          interests?: string[] | null
          is_active?: boolean
          is_premium?: boolean
          is_simulated?: boolean
          languages?: string[] | null
          latitude?: number | null
          location_city?: string | null
          location_country?: string | null
          location_updated_at?: string | null
          longitude?: number | null
          orientation?: string | null
          phone?: string | null
          photos?: string[] | null
          preferred_age_max?: number | null
          preferred_age_min?: number | null
          preferred_countries?: string[] | null
          preferred_ethnicities?: string[] | null
          preferred_genders?: string[] | null
          preferred_orientations?: string[] | null
          preferred_relationship_goals?: string[] | null
          preferred_religions?: string[] | null
          relationship_goals?: string | null
          religion?: string | null
          smoking?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          ads_enabled: boolean
          allowed_country_codes: string[]
          canonical_url: string | null
          contact_email: string | null
          contact_whatsapp: string | null
          enable_2fa_email: boolean
          enable_otp_login: boolean
          favicon_url: string | null
          google_site_verification: string | null
          id: number
          logo_url: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          og_image_url: string | null
          premium_message: string | null
          primary_color: string | null
          site_name: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          ads_enabled?: boolean
          allowed_country_codes?: string[]
          canonical_url?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          enable_2fa_email?: boolean
          enable_otp_login?: boolean
          favicon_url?: string | null
          google_site_verification?: string | null
          id?: number
          logo_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          premium_message?: string | null
          primary_color?: string | null
          site_name?: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          ads_enabled?: boolean
          allowed_country_codes?: string[]
          canonical_url?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          enable_2fa_email?: boolean
          enable_otp_login?: boolean
          favicon_url?: string | null
          google_site_verification?: string | null
          id?: number
          logo_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          premium_message?: string | null
          primary_color?: string | null
          site_name?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          from_email: string | null
          from_name: string | null
          host: string | null
          id: number
          is_active: boolean
          password: string | null
          port: number | null
          reply_to: string | null
          secure: boolean | null
          updated_at: string
          username: string | null
        }
        Insert: {
          from_email?: string | null
          from_name?: string | null
          host?: string | null
          id?: number
          is_active?: boolean
          password?: string | null
          port?: number | null
          reply_to?: string | null
          secure?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          from_email?: string | null
          from_name?: string | null
          host?: string | null
          id?: number
          is_active?: boolean
          password?: string | null
          port?: number | null
          reply_to?: string | null
          secure?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      swipes: {
        Row: {
          created_at: string
          id: string
          liked: boolean
          swiper_id: string
          target_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liked: boolean
          swiper_id: string
          target_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liked?: boolean
          swiper_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          accuracy: number | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          latitude: number
          longitude: number
          source: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          source?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          source?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_message: { Args: { _a: string; _b: string }; Returns: boolean }
      click_ad: { Args: { _ad_id: string }; Returns: number }
      consume_bonus_swipe: { Args: never; Returns: boolean }
      create_simulated_match: {
        Args: { _target_id: string; _user_id: string }
        Returns: Json
      }
      get_mpesa_public_settings: {
        Args: never
        Returns: {
          account_reference: string
          amount: number
          description: string
          environment: string
          is_active: boolean
        }[]
      }
      grant_premium_for_payment: {
        Args: { _payment_id: string; _user_id: string }
        Returns: undefined
      }
      grant_premium_manual: {
        Args: { _days: number; _note?: string; _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recommend_profiles: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          age: number
          bio: string
          city: string
          conditions: string[]
          country: string
          display_name: string
          distance_km: number
          ethnicity: string
          gender: string
          id: string
          interests: string[]
          orientation: string
          photos: string[]
          religion: string
          score: number
        }[]
      }
      unread_counts: { Args: { _user_id: string }; Returns: Json }
      upsert_swipe: {
        Args: { _liked: boolean; _swiper_id: string; _target_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user" | "moderator"
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
    Enums: {
      app_role: ["admin", "user", "moderator"],
    },
  },
} as const
