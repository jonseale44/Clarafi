--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ab_test_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ab_test_assignments (
    id integer NOT NULL,
    test_id integer NOT NULL,
    user_id integer,
    session_id text,
    variant text NOT NULL,
    assigned_at timestamp without time zone DEFAULT now(),
    converted boolean DEFAULT false,
    converted_at timestamp without time zone,
    conversion_value numeric(10,2),
    metadata jsonb
);


--
-- Name: ab_test_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ab_test_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ab_test_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ab_test_assignments_id_seq OWNED BY public.ab_test_assignments.id;


--
-- Name: ab_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ab_tests (
    id integer NOT NULL,
    health_system_id integer,
    name text NOT NULL,
    description text,
    hypothesis text,
    status text DEFAULT 'draft'::text,
    variants jsonb NOT NULL,
    targeting_criteria jsonb,
    primary_metric text NOT NULL,
    secondary_metrics text[],
    results jsonb,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: ab_tests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ab_tests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ab_tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ab_tests_id_seq OWNED BY public.ab_tests.id;


--
-- Name: ad_campaign_performance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_campaign_performance (
    id integer NOT NULL,
    account_id integer NOT NULL,
    health_system_id integer,
    external_campaign_id text NOT NULL,
    campaign_name text,
    campaign_type text,
    date date NOT NULL,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    cost numeric(10,2) DEFAULT '0'::numeric,
    conversions numeric(10,2) DEFAULT '0'::numeric,
    conversion_value numeric(10,2) DEFAULT '0'::numeric,
    ctr numeric(5,2),
    cpc numeric(10,2),
    cpa numeric(10,2),
    roas numeric(10,2),
    ad_group_data jsonb,
    keyword_data jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: ad_campaign_performance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ad_campaign_performance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ad_campaign_performance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ad_campaign_performance_id_seq OWNED BY public.ad_campaign_performance.id;


--
-- Name: ad_platform_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_platform_accounts (
    id integer NOT NULL,
    health_system_id integer NOT NULL,
    platform text NOT NULL,
    account_id text NOT NULL,
    account_name text,
    credentials jsonb,
    last_sync_at timestamp without time zone,
    sync_status text DEFAULT 'pending'::text,
    sync_error text,
    account_metrics jsonb,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: ad_platform_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ad_platform_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ad_platform_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ad_platform_accounts_id_seq OWNED BY public.ad_platform_accounts.id;


--
-- Name: admin_prompt_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_prompt_reviews (
    id integer NOT NULL,
    template_id integer NOT NULL,
    original_prompt text NOT NULL,
    reviewed_prompt text,
    admin_user_id integer,
    review_status text DEFAULT 'pending'::text,
    review_notes text,
    is_active boolean DEFAULT false,
    performance_metrics jsonb,
    created_at timestamp without time zone DEFAULT now(),
    reviewed_at timestamp without time zone
);


--
-- Name: admin_prompt_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_prompt_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_prompt_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_prompt_reviews_id_seq OWNED BY public.admin_prompt_reviews.id;


--
-- Name: allergies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allergies (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    allergen text NOT NULL,
    reaction text,
    severity text,
    allergy_type text,
    onset_date date,
    last_reaction_date date,
    status text DEFAULT 'active'::text,
    verification_status text DEFAULT 'unconfirmed'::text,
    drug_class text,
    cross_reactivity text[],
    encounter_id integer,
    notes text,
    reaction_type text,
    verified_by integer,
    verified_at timestamp without time zone,
    source_timestamp timestamp without time zone,
    last_reaction date,
    merged_ids integer[],
    source_type text DEFAULT 'manual_entry'::text,
    source_confidence numeric(3,2) DEFAULT 1.00,
    source_notes text,
    extracted_from_attachment_id integer,
    last_updated_encounter_id integer,
    entered_by integer,
    consolidation_reasoning text,
    extraction_notes text,
    temporal_conflict_resolution text,
    visit_history jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: allergies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allergies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: allergies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.allergies_id_seq OWNED BY public.allergies.id;


--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_events (
    id integer NOT NULL,
    health_system_id integer,
    user_id integer,
    session_id text NOT NULL,
    event_type text NOT NULL,
    event_category text,
    event_action text,
    event_label text,
    event_value integer,
    event_data jsonb,
    page_url text,
    page_title text,
    referrer text,
    user_agent text,
    device_type text,
    browser_name text,
    browser_version text,
    os_name text,
    os_version text,
    screen_resolution text,
    session_duration integer,
    is_new_session boolean DEFAULT false,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    "timestamp" timestamp without time zone NOT NULL,
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: analytics_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.analytics_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analytics_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analytics_events_id_seq OWNED BY public.analytics_events.id;


--
-- Name: appointment_duration_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_duration_history (
    id integer NOT NULL,
    appointment_id integer NOT NULL,
    ai_predicted_duration integer NOT NULL,
    provider_scheduled_duration integer NOT NULL,
    patient_visible_duration integer NOT NULL,
    actual_duration integer,
    actual_arrival_delta integer,
    factors_used jsonb,
    prediction_accuracy numeric(5,2),
    provider_feedback text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: appointment_duration_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointment_duration_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointment_duration_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointment_duration_history_id_seq OWNED BY public.appointment_duration_history.id;


--
-- Name: appointment_resource_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_resource_requirements (
    id integer NOT NULL,
    appointment_type_id integer,
    requires_room boolean DEFAULT true,
    room_type text,
    requires_equipment text[],
    requires_staff jsonb,
    prep_time integer DEFAULT 0,
    cleanup_time integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: appointment_resource_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointment_resource_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointment_resource_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointment_resource_requirements_id_seq OWNED BY public.appointment_resource_requirements.id;


--
-- Name: appointment_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_types (
    id integer NOT NULL,
    health_system_id integer,
    location_id integer,
    type_name text NOT NULL,
    type_code text NOT NULL,
    category text NOT NULL,
    default_duration integer NOT NULL,
    min_duration integer NOT NULL,
    max_duration integer NOT NULL,
    allow_online_scheduling boolean DEFAULT true,
    requires_pre_auth boolean DEFAULT false,
    requires_special_prep boolean DEFAULT false,
    prep_instructions text,
    default_resource_requirements jsonb,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: appointment_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointment_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointment_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointment_types_id_seq OWNED BY public.appointment_types.id;


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    location_id integer NOT NULL,
    appointment_date date NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    duration integer NOT NULL,
    patient_visible_duration integer,
    provider_scheduled_duration integer,
    appointment_type text NOT NULL,
    appointment_type_id integer,
    chief_complaint text,
    visit_reason text,
    status text DEFAULT 'scheduled'::text,
    confirmation_status text DEFAULT 'pending'::text,
    checked_in_at timestamp without time zone,
    checked_in_by integer,
    room_assignment text,
    urgency_level text DEFAULT 'routine'::text,
    scheduling_notes text,
    patient_preferences jsonb,
    ai_scheduling_data jsonb,
    reminders_sent integer DEFAULT 0,
    last_reminder_sent timestamp without time zone,
    communication_preferences jsonb,
    external_appointment_id text,
    synced_at timestamp without time zone,
    insurance_verified boolean DEFAULT false,
    verified_by integer,
    copay_amount numeric(10,2),
    actual_duration integer,
    ai_predicted_duration integer,
    billing_notes text,
    cancellation_reason text,
    cancelled_at timestamp without time zone,
    cancelled_by integer,
    chart_reviewed boolean DEFAULT false,
    completed_at timestamp without time zone,
    completed_by integer,
    confirmation_sent boolean DEFAULT false,
    confirmation_sent_at timestamp without time zone,
    copay_collected boolean DEFAULT false,
    duration_minutes integer,
    forms_completed boolean DEFAULT false,
    images_reviewed boolean DEFAULT false,
    insurance_verification_notes text,
    intake_completed_at timestamp without time zone,
    interpreter_language text,
    interpreter_needed boolean DEFAULT false,
    labs_reviewed boolean DEFAULT false,
    late_cancellation_reason text,
    medications_reconciled boolean DEFAULT false,
    no_show_reason text,
    notes text,
    parent_appointment_id integer,
    patient_confirmed boolean DEFAULT false,
    patient_confirmed_at timestamp without time zone,
    post_appointment_notes text,
    pre_appointment_notes text,
    problems_reviewed boolean DEFAULT false,
    provider_ready_at timestamp without time zone,
    recurrence_exceptions jsonb DEFAULT '[]'::jsonb,
    recurrence_rule text,
    referral_reason text,
    referring_provider text,
    reminder_sent boolean DEFAULT false,
    reminder_sent_at timestamp without time zone,
    rescheduled_from integer,
    rescheduled_reason text,
    resource_requirements jsonb DEFAULT '{}'::jsonb,
    room_number text,
    special_instructions text,
    tags jsonb DEFAULT '[]'::jsonb,
    use_ai_scheduling boolean DEFAULT true,
    visit_completed_at timestamp without time zone,
    vital_signs_taken boolean DEFAULT false,
    wait_list_priority integer,
    wheelchair_accessible boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer NOT NULL
);


--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: archive_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archive_access_logs (
    id integer NOT NULL,
    archive_id uuid NOT NULL,
    accessed_by integer NOT NULL,
    accessed_by_name text NOT NULL,
    accessed_by_role text NOT NULL,
    access_type text NOT NULL,
    access_reason text NOT NULL,
    accessed_at timestamp without time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    tables_accessed text[],
    record_count integer,
    success boolean NOT NULL,
    error_message text,
    mfa_verified boolean DEFAULT false,
    session_id text
);


--
-- Name: archive_access_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.archive_access_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: archive_access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.archive_access_logs_id_seq OWNED BY public.archive_access_logs.id;


--
-- Name: archived_attachment_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archived_attachment_metadata (
    id integer NOT NULL,
    archive_id uuid NOT NULL,
    original_id integer NOT NULL,
    patient_id integer NOT NULL,
    file_name text,
    file_type text,
    file_size_bytes integer,
    uploaded_at timestamp without time zone,
    was_processed boolean,
    document_type text,
    has_extracted_content boolean,
    original_storage_path text,
    is_recoverable boolean DEFAULT false,
    archived_at timestamp without time zone DEFAULT now()
);


--
-- Name: archived_attachment_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.archived_attachment_metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: archived_attachment_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.archived_attachment_metadata_id_seq OWNED BY public.archived_attachment_metadata.id;


--
-- Name: archived_encounters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archived_encounters (
    id integer NOT NULL,
    archive_id uuid NOT NULL,
    original_id integer NOT NULL,
    patient_id integer NOT NULL,
    provider_id integer,
    encounter_type text,
    chief_complaint text,
    encounter_date date,
    status text,
    is_signed boolean,
    signed_at timestamp without time zone,
    has_vitals boolean,
    has_soap_note boolean,
    has_orders boolean,
    attachment_count integer,
    archived_at timestamp without time zone DEFAULT now()
);


--
-- Name: archived_encounters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.archived_encounters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: archived_encounters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.archived_encounters_id_seq OWNED BY public.archived_encounters.id;


--
-- Name: archived_health_systems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archived_health_systems (
    id integer NOT NULL,
    archive_id uuid NOT NULL,
    original_id integer NOT NULL,
    name text NOT NULL,
    system_type text,
    tax_id text,
    npi text,
    website text,
    phone text,
    fax text,
    email text,
    address text,
    city text,
    state text,
    zip_code text,
    subscription_status text,
    subscription_tier integer,
    stripe_customer_id text,
    stripe_subscription_id text,
    trial_end_date timestamp without time zone,
    original_created_at timestamp without time zone,
    original_updated_at timestamp without time zone,
    archived_at timestamp without time zone DEFAULT now()
);


--
-- Name: archived_health_systems_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.archived_health_systems_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: archived_health_systems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.archived_health_systems_id_seq OWNED BY public.archived_health_systems.id;


--
-- Name: archived_patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archived_patients (
    id integer NOT NULL,
    archive_id uuid NOT NULL,
    original_id integer NOT NULL,
    health_system_id integer NOT NULL,
    mrn text,
    year_of_birth integer,
    gender text,
    state_of_residence text,
    has_allergies boolean,
    has_medications boolean,
    has_problems boolean,
    encounter_count integer,
    last_encounter_date date,
    original_created_at timestamp without time zone,
    archived_at timestamp without time zone DEFAULT now()
);


--
-- Name: archived_patients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.archived_patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: archived_patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.archived_patients_id_seq OWNED BY public.archived_patients.id;


--
-- Name: archived_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archived_users (
    id integer NOT NULL,
    archive_id uuid NOT NULL,
    original_id integer NOT NULL,
    username text NOT NULL,
    email_hash text NOT NULL,
    health_system_id integer,
    first_name_initial text,
    last_name_initial text,
    role text,
    npi text,
    credentials text,
    specialties text[],
    license_state text,
    account_status text,
    last_login timestamp without time zone,
    email_verified boolean,
    mfa_enabled boolean,
    original_created_at timestamp without time zone,
    archived_at timestamp without time zone DEFAULT now()
);


--
-- Name: archived_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.archived_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: archived_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.archived_users_id_seq OWNED BY public.archived_users.id;


--
-- Name: article_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_comments (
    id integer NOT NULL,
    article_id integer NOT NULL,
    author_name text NOT NULL,
    author_email text NOT NULL,
    content text NOT NULL,
    is_approved boolean DEFAULT false,
    parent_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: article_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.article_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: article_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.article_comments_id_seq OWNED BY public.article_comments.id;


--
-- Name: article_generation_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_generation_queue (
    id integer NOT NULL,
    topic text,
    category text NOT NULL,
    target_audience text NOT NULL,
    keywords text[],
    competitor_mentions text[],
    custom_prompt text,
    research_sources jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    generated_article_id integer,
    error text,
    created_at timestamp without time zone DEFAULT now(),
    processed_at timestamp without time zone
);


--
-- Name: article_generation_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.article_generation_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: article_generation_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.article_generation_queue_id_seq OWNED BY public.article_generation_queue.id;


--
-- Name: article_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_revisions (
    id integer NOT NULL,
    article_id integer NOT NULL,
    content text NOT NULL,
    revision_note text,
    revision_type text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: article_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.article_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: article_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.article_revisions_id_seq OWNED BY public.article_revisions.id;


--
-- Name: articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles (
    id integer NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    content text NOT NULL,
    excerpt text,
    category text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    author_name text DEFAULT 'Clarafi Team'::text,
    featured_image text,
    meta_title text,
    meta_description text,
    keywords text[],
    target_audience text,
    reading_time integer,
    view_count integer DEFAULT 0,
    published_at timestamp without time zone,
    scheduled_for timestamp without time zone,
    generated_at timestamp without time zone DEFAULT now(),
    reviewed_at timestamp without time zone,
    reviewed_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: articles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.articles_id_seq OWNED BY public.articles.id;


--
-- Name: asymmetric_scheduling_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asymmetric_scheduling_config (
    id integer NOT NULL,
    provider_id integer,
    location_id integer,
    health_system_id integer,
    enabled boolean DEFAULT true,
    patient_min_duration integer DEFAULT 20,
    provider_min_duration integer DEFAULT 10,
    rounding_interval integer DEFAULT 10,
    default_buffer_minutes integer DEFAULT 0,
    buffer_for_chronic_patients integer DEFAULT 10,
    buffer_threshold_problem_count integer DEFAULT 5,
    created_at timestamp without time zone DEFAULT now(),
    created_by integer NOT NULL
);


--
-- Name: asymmetric_scheduling_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asymmetric_scheduling_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asymmetric_scheduling_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asymmetric_scheduling_config_id_seq OWNED BY public.asymmetric_scheduling_config.id;


--
-- Name: attachment_extracted_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachment_extracted_content (
    id integer NOT NULL,
    attachment_id integer NOT NULL,
    page_number integer,
    content_type text NOT NULL,
    extracted_text text,
    structured_data jsonb,
    confidence_score numeric(5,2),
    extraction_method text,
    ai_generated_title text,
    document_type text,
    processing_status text DEFAULT 'pending'::text,
    error_message text,
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: attachment_extracted_content_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attachment_extracted_content_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attachment_extracted_content_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attachment_extracted_content_id_seq OWNED BY public.attachment_extracted_content.id;


--
-- Name: authentication_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authentication_logs (
    id integer NOT NULL,
    user_id integer,
    username text NOT NULL,
    email text,
    health_system_id integer,
    event_type text NOT NULL,
    success boolean NOT NULL,
    failure_reason text,
    ip_address text NOT NULL,
    user_agent text,
    browser_info text,
    device_info text,
    geolocation jsonb,
    session_id text,
    session_duration integer,
    logout_type text,
    logout_reason text,
    mfa_type text,
    mfa_success boolean,
    risk_score integer,
    risk_factors text[],
    event_time timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: authentication_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.authentication_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: authentication_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.authentication_logs_id_seq OWNED BY public.authentication_logs.id;


--
-- Name: clinic_admin_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_admin_verifications (
    id integer NOT NULL,
    email text NOT NULL,
    organization_name text NOT NULL,
    verification_code text NOT NULL,
    verification_data jsonb NOT NULL,
    status text DEFAULT 'pending'::text,
    health_system_id integer,
    submitted_at timestamp without time zone DEFAULT now(),
    approved_at timestamp without time zone,
    rejected_at timestamp without time zone,
    rejection_reason text,
    expires_at timestamp without time zone NOT NULL,
    approved_by integer,
    ip_address text,
    user_agent text
);


--
-- Name: clinic_admin_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clinic_admin_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clinic_admin_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clinic_admin_verifications_id_seq OWNED BY public.clinic_admin_verifications.id;


--
-- Name: conversion_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversion_events (
    id integer NOT NULL,
    user_id integer,
    health_system_id integer,
    event_type text NOT NULL,
    event_timestamp timestamp without time zone DEFAULT now(),
    session_id text,
    device_type text,
    browser_info jsonb,
    acquisition_id integer,
    event_data jsonb,
    monetary_value numeric(10,2),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: conversion_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversion_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversion_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversion_events_id_seq OWNED BY public.conversion_events.id;


--
-- Name: data_archives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_archives (
    id integer NOT NULL,
    archive_id uuid DEFAULT gen_random_uuid() NOT NULL,
    health_system_id integer NOT NULL,
    health_system_name text NOT NULL,
    archive_reason text NOT NULL,
    archived_at timestamp without time zone DEFAULT now() NOT NULL,
    archived_by integer,
    retention_end_date date NOT NULL,
    is_purged boolean DEFAULT false,
    purged_at timestamp without time zone,
    has_been_restored boolean DEFAULT false,
    last_restored_at timestamp without time zone,
    restored_by integer,
    original_subscription_tier integer,
    original_subscription_status text,
    data_statistics jsonb,
    legal_hold boolean DEFAULT false,
    legal_hold_reason text,
    compliance_notes text
);


--
-- Name: data_archives_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_archives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_archives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_archives_id_seq OWNED BY public.data_archives.id;


--
-- Name: data_modification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_modification_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    user_name text NOT NULL,
    user_role text NOT NULL,
    health_system_id integer NOT NULL,
    table_name text NOT NULL,
    record_id integer NOT NULL,
    patient_id integer,
    operation text NOT NULL,
    field_name text,
    old_value jsonb,
    new_value jsonb,
    change_reason text,
    encounter_id integer,
    order_authority text,
    validated boolean DEFAULT false,
    validated_by integer,
    validated_at timestamp without time zone,
    modified_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: data_modification_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_modification_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_modification_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_modification_logs_id_seq OWNED BY public.data_modification_logs.id;


--
-- Name: diagnoses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnoses (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    encounter_id integer NOT NULL,
    diagnosis_code text,
    diagnosis_description text,
    diagnosis_type text,
    status text NOT NULL,
    onset_date date,
    resolution_date date,
    notes text,
    severity text,
    clinician_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: diagnoses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.diagnoses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: diagnoses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diagnoses_id_seq OWNED BY public.diagnoses.id;


--
-- Name: document_processing_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_processing_queue (
    id integer NOT NULL,
    attachment_id integer NOT NULL,
    status text DEFAULT 'queued'::text,
    attempts integer DEFAULT 0,
    priority integer DEFAULT 100,
    processor_type text DEFAULT 'document_analysis'::text NOT NULL,
    processing_metadata jsonb,
    error_message text,
    retry_count integer DEFAULT 0,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: document_processing_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_processing_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_processing_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_processing_queue_id_seq OWNED BY public.document_processing_queue.id;


--
-- Name: electronic_signatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.electronic_signatures (
    id integer NOT NULL,
    user_id integer NOT NULL,
    encounter_id integer,
    signature_type text NOT NULL,
    signature_data text NOT NULL,
    signature_method text NOT NULL,
    two_factor_method text,
    two_factor_verified boolean DEFAULT false,
    two_factor_timestamp timestamp without time zone,
    compliance_checks jsonb DEFAULT '{}'::jsonb,
    dea_compliance_level text,
    ip_address text,
    user_agent text,
    signed_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone,
    revoked_at timestamp without time zone,
    revocation_reason text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: electronic_signatures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.electronic_signatures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: electronic_signatures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.electronic_signatures_id_seq OWNED BY public.electronic_signatures.id;


--
-- Name: email_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_notifications (
    id integer NOT NULL,
    user_id integer,
    health_system_id integer,
    notification_type character varying(50) NOT NULL,
    sent_at timestamp without time zone DEFAULT now(),
    email_address character varying(255) NOT NULL,
    subject text,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: email_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_notifications_id_seq OWNED BY public.email_notifications.id;


--
-- Name: emergency_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_access_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    user_name text NOT NULL,
    user_role text NOT NULL,
    health_system_id integer NOT NULL,
    patient_id integer NOT NULL,
    patient_name text NOT NULL,
    emergency_type text NOT NULL,
    justification text NOT NULL,
    authorizing_physician text,
    access_start_time timestamp without time zone DEFAULT now() NOT NULL,
    access_end_time timestamp without time zone,
    accessed_resources jsonb DEFAULT '[]'::jsonb,
    review_required boolean DEFAULT true,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    review_outcome text,
    review_notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: emergency_access_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.emergency_access_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: emergency_access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.emergency_access_logs_id_seq OWNED BY public.emergency_access_logs.id;


--
-- Name: encounters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.encounters (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    encounter_type text NOT NULL,
    encounter_subtype text,
    start_time timestamp without time zone DEFAULT now(),
    end_time timestamp without time zone,
    encounter_status text DEFAULT 'scheduled'::text,
    chief_complaint text,
    note text,
    nurse_assessment text,
    nurse_interventions text,
    nurse_notes text,
    transcription_raw text,
    transcription_processed text,
    ai_suggestions jsonb DEFAULT '{}'::jsonb,
    draft_orders jsonb DEFAULT '[]'::jsonb,
    draft_diagnoses jsonb DEFAULT '[]'::jsonb,
    cpt_codes jsonb DEFAULT '[]'::jsonb,
    location text,
    appointment_id integer,
    signature_id integer,
    encounter_date timestamp without time zone,
    template_id integer,
    signed_by integer,
    visit_reason text,
    notes text,
    location_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    last_chart_update timestamp without time zone,
    chart_update_duration integer
);


--
-- Name: encounters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.encounters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: encounters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.encounters_id_seq OWNED BY public.encounters.id;


--
-- Name: external_labs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_labs (
    id integer NOT NULL,
    lab_name text NOT NULL,
    lab_code text,
    lab_identifier text NOT NULL,
    interface_type text NOT NULL,
    connection_details jsonb,
    api_endpoint text,
    api_key text,
    hl7_endpoint text,
    hl7_version text,
    hl7_sending_facility text,
    hl7_receiving_facility text,
    sftp_host text,
    sftp_username text,
    sftp_password text,
    sftp_directory text,
    username_encrypted text,
    ssl_certificate_path text,
    account_number text,
    operating_hours jsonb,
    contact_phone text,
    contact_email text,
    technical_contact text,
    supported_tests jsonb,
    turnaround_times jsonb,
    test_mapping jsonb,
    result_mapping jsonb,
    requires_patient_consent boolean DEFAULT false,
    consent_form_url text,
    billing_info jsonb,
    last_connection_test timestamp without time zone,
    connection_status text,
    error_log jsonb,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: external_labs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_labs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: external_labs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_labs_id_seq OWNED BY public.external_labs.id;


--
-- Name: family_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.family_history (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    relationship text NOT NULL,
    condition text,
    last_updated_encounter_id integer,
    visit_history jsonb,
    source_type text DEFAULT 'manual_entry'::text,
    source_confidence numeric(3,2) DEFAULT 1.00,
    notes text,
    extracted_from_attachment_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: family_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.family_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: family_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.family_history_id_seq OWNED BY public.family_history.id;


--
-- Name: feature_usage_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_usage_stats (
    id integer NOT NULL,
    health_system_id integer,
    user_id integer,
    feature_name text NOT NULL,
    feature_category text,
    usage_date date NOT NULL,
    usage_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    error_count integer DEFAULT 0,
    avg_processing_time numeric,
    min_processing_time numeric,
    max_processing_time numeric,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: feature_usage_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feature_usage_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feature_usage_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feature_usage_stats_id_seq OWNED BY public.feature_usage_stats.id;


--
-- Name: gpt_lab_review_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gpt_lab_review_notes (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    encounter_id integer,
    result_ids integer[] NOT NULL,
    clinical_review text NOT NULL,
    patient_message text NOT NULL,
    nurse_message text NOT NULL,
    patient_context jsonb,
    gpt_model text DEFAULT 'gpt-4'::text,
    prompt_version text DEFAULT 'v1.0'::text,
    revised_by integer,
    revision_reason text,
    processing_time integer,
    tokens_used integer,
    status text DEFAULT 'draft'::text,
    generated_by integer NOT NULL,
    reviewed_by integer,
    generated_at timestamp without time zone DEFAULT now(),
    reviewed_at timestamp without time zone,
    patient_message_sent boolean DEFAULT false,
    nurse_message_sent boolean DEFAULT false,
    patient_message_sent_at timestamp without time zone,
    nurse_message_sent_at timestamp without time zone,
    revision_history jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    conversation_review text,
    conversation_review_generated_at timestamp without time zone,
    conversation_closed boolean DEFAULT false,
    conversation_closed_at timestamp without time zone
);


--
-- Name: gpt_lab_review_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gpt_lab_review_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gpt_lab_review_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gpt_lab_review_notes_id_seq OWNED BY public.gpt_lab_review_notes.id;


--
-- Name: health_systems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_systems (
    id integer NOT NULL,
    name text NOT NULL,
    short_name text,
    system_type text NOT NULL,
    subscription_tier integer DEFAULT 1,
    subscription_status text DEFAULT 'active'::text,
    subscription_start_date timestamp without time zone,
    subscription_end_date timestamp without time zone,
    merged_into_health_system_id integer,
    merged_date timestamp without time zone,
    original_provider_id integer,
    primary_contact text,
    phone text,
    email text,
    website text,
    npi text,
    tax_id text,
    logo_url text,
    brand_colors jsonb,
    subscription_limits jsonb DEFAULT '{"staffKeys": 0, "totalUsers": 0, "providerKeys": 0}'::jsonb,
    active_user_count jsonb DEFAULT '{"providers": 0, "adminStaff": 0, "lastUpdated": "2025-07-27T01:19:28.631Z", "clinicalStaff": 0}'::jsonb,
    trial_end_date timestamp without time zone,
    grace_period_end_date timestamp without time zone,
    stripe_customer_id text,
    billing_details jsonb DEFAULT '{"monthlyTotal": 0, "providerRate": 399, "adminStaffRate": 49, "clinicalStaffRate": 99}'::jsonb,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: health_systems_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_systems_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_systems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_systems_id_seq OWNED BY public.health_systems.id;


--
-- Name: healthcare_marketing_intelligence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.healthcare_marketing_intelligence (
    id integer NOT NULL,
    health_system_id integer,
    market_segment text NOT NULL,
    competitor_analysis jsonb,
    payer_mix_analysis jsonb,
    referral_analysis jsonb,
    procedure_profitability jsonb,
    clinical_outcomes jsonb,
    geographic_analysis jsonb,
    analysis_date date NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: healthcare_marketing_intelligence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.healthcare_marketing_intelligence_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: healthcare_marketing_intelligence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.healthcare_marketing_intelligence_id_seq OWNED BY public.healthcare_marketing_intelligence.id;


--
-- Name: hl7_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hl7_messages (
    id integer NOT NULL,
    external_lab_id integer,
    message_type text NOT NULL,
    message_control_id text,
    raw_message text NOT NULL,
    direction text DEFAULT 'inbound'::text,
    processed_at timestamp without time zone DEFAULT now(),
    processing_status text,
    processing_error text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: hl7_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hl7_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hl7_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hl7_messages_id_seq OWNED BY public.hl7_messages.id;


--
-- Name: imaging_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imaging_orders (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    encounter_id integer NOT NULL,
    provider_id integer NOT NULL,
    imaging_type text NOT NULL,
    body_part text NOT NULL,
    laterality text,
    indication text NOT NULL,
    clinical_history text,
    priority text DEFAULT 'routine'::text,
    status text DEFAULT 'pending'::text,
    facility_id integer,
    scheduled_date timestamp without time zone,
    completed_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: imaging_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.imaging_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: imaging_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imaging_orders_id_seq OWNED BY public.imaging_orders.id;


--
-- Name: imaging_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imaging_results (
    id integer NOT NULL,
    imaging_order_id integer,
    patient_id integer NOT NULL,
    study_date timestamp without time zone NOT NULL,
    study_type text NOT NULL,
    modality text NOT NULL,
    body_part text,
    laterality text,
    findings text,
    impression text,
    reading_radiologist text,
    performing_facility text,
    extracted_from_attachment_id integer,
    pacs_study_uid text,
    report_status text DEFAULT 'preliminary'::text,
    source_type text DEFAULT 'pdf_extract'::text,
    source_confidence numeric(3,2) DEFAULT 0.95,
    visit_history jsonb DEFAULT '[]'::jsonb,
    encounter_id integer,
    recommendations text,
    technique text,
    procedure_code text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: imaging_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.imaging_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: imaging_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imaging_results_id_seq OWNED BY public.imaging_results.id;


--
-- Name: lab_interface_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_interface_mappings (
    id integer NOT NULL,
    external_lab_id integer NOT NULL,
    direction text NOT NULL,
    internal_code text NOT NULL,
    external_code text NOT NULL,
    external_name text,
    mapping_type text NOT NULL,
    mapping_notes text,
    transform_rules jsonb,
    valid_from date,
    valid_to date,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: lab_interface_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_interface_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_interface_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_interface_mappings_id_seq OWNED BY public.lab_interface_mappings.id;


--
-- Name: lab_order_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_order_sets (
    id integer NOT NULL,
    set_code text NOT NULL,
    set_name text NOT NULL,
    category text,
    test_components jsonb NOT NULL,
    clinical_indications text[],
    department text,
    usage_count integer DEFAULT 0,
    last_used timestamp without time zone,
    active boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: lab_order_sets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_order_sets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_order_sets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_order_sets_id_seq OWNED BY public.lab_order_sets.id;


--
-- Name: lab_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_orders (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    encounter_id integer NOT NULL,
    order_set_id text,
    loinc_code text NOT NULL,
    cpt_code text,
    test_code text NOT NULL,
    test_name text NOT NULL,
    test_category text,
    priority text DEFAULT 'routine'::text,
    clinical_indication text,
    icd10_codes text[],
    ordered_by integer NOT NULL,
    ordered_at timestamp without time zone DEFAULT now(),
    target_lab_id integer,
    external_order_id text,
    hl7_message_id text,
    requisition_number text,
    order_status text DEFAULT 'draft'::text,
    transmitted_at timestamp without time zone,
    acknowledged_at timestamp without time zone,
    collected_at timestamp without time zone,
    specimen_type text,
    specimen_volume text,
    container_type text,
    collection_instructions text,
    fasting_required boolean DEFAULT false,
    fasting_hours integer,
    timing_instructions text,
    insurance_preauth text,
    estimated_cost numeric(10,2),
    insurance_coverage text,
    ai_suggested_tests jsonb,
    risk_flags jsonb,
    quality_measure text,
    preventive_care_flag boolean DEFAULT false,
    order_id text,
    results jsonb,
    external_lab text,
    provider_notes text,
    result_status text,
    special_instructions text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: lab_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_orders_id_seq OWNED BY public.lab_orders.id;


--
-- Name: lab_reference_ranges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_reference_ranges (
    id integer NOT NULL,
    loinc_code text NOT NULL,
    test_name text NOT NULL,
    test_category text,
    gender text,
    age_min integer DEFAULT 0,
    age_max integer DEFAULT 120,
    normal_low numeric(15,6),
    normal_high numeric(15,6),
    units text NOT NULL,
    critical_low numeric(15,6),
    critical_high numeric(15,6),
    display_range text,
    lab_source text,
    last_verified timestamp without time zone DEFAULT now(),
    active boolean DEFAULT true,
    clinical_notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: lab_reference_ranges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_reference_ranges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_reference_ranges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_reference_ranges_id_seq OWNED BY public.lab_reference_ranges.id;


--
-- Name: lab_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_results (
    id integer NOT NULL,
    lab_order_id integer,
    patient_id integer NOT NULL,
    loinc_code text NOT NULL,
    test_code text NOT NULL,
    test_name text NOT NULL,
    test_category text,
    result_value text,
    result_numeric numeric(15,6),
    result_units text,
    reference_range text,
    age_gender_adjusted_range text,
    abnormal_flag text,
    critical_flag boolean DEFAULT false,
    delta_flag text,
    specimen_collected_at timestamp without time zone,
    specimen_received_at timestamp without time zone,
    result_available_at timestamp without time zone,
    result_finalized_at timestamp without time zone,
    received_at timestamp without time zone DEFAULT now(),
    external_lab_id integer,
    external_result_id text,
    hl7_message_id text,
    instrument_id text,
    result_status text DEFAULT 'pending'::text,
    verification_status text DEFAULT 'unverified'::text,
    result_comments text,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    provider_notes text,
    needs_review boolean DEFAULT true,
    review_status text DEFAULT 'pending'::text,
    review_note text,
    review_template text,
    review_history jsonb DEFAULT '[]'::jsonb,
    communication_status text DEFAULT 'none'::text,
    communication_plan jsonb,
    portal_release_status text DEFAULT 'hold'::text,
    portal_release_by integer,
    portal_release_at timestamp without time zone,
    block_portal_release boolean DEFAULT false,
    ai_interpretation jsonb,
    previous_value numeric(15,6),
    previous_date timestamp without time zone,
    trend_direction text,
    percent_change numeric(5,2),
    qc_flags jsonb,
    source_system text,
    interface_version text,
    source_type text DEFAULT 'lab_order'::text,
    source_confidence text,
    source_notes text,
    extracted_from_attachment_id integer,
    entered_by integer,
    extraction_notes text,
    consolidation_reasoning text,
    merged_ids integer[],
    visit_history jsonb,
    patient_communication_sent boolean DEFAULT false,
    patient_communication_method text,
    patient_communication_sent_at timestamp without time zone,
    patient_notified_by integer,
    patient_message text,
    patient_message_sent_at timestamp without time zone,
    delta_check jsonb,
    trend_indicators jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: lab_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_results_id_seq OWNED BY public.lab_results.id;


--
-- Name: lab_test_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_catalog (
    id integer NOT NULL,
    loinc_code text NOT NULL,
    loinc_name text NOT NULL,
    loinc_short_name text,
    quest_code text,
    quest_name text,
    labcorp_code text,
    labcorp_name text,
    hospital_code text,
    category text NOT NULL,
    subcategory text,
    panel_components jsonb,
    common_name text NOT NULL,
    synonyms text[],
    clinical_utility text,
    expected_turnaround integer,
    primary_specimen_type text NOT NULL,
    alternate_specimen_types text[],
    minimum_volume text,
    container_type text,
    storage_requirements text,
    patient_preparation text,
    collection_instructions text,
    transport_instructions text,
    stability_info jsonb,
    cpt_code text,
    medicare_fee_schedule numeric(10,2),
    requires_prior_auth boolean DEFAULT false,
    ncd_lcd_coverage text,
    available_at jsonb,
    orderable boolean DEFAULT true,
    obsolete boolean DEFAULT false,
    replaced_by text,
    last_validated timestamp without time zone,
    validated_by integer,
    source text DEFAULT 'manual'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: lab_test_catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_test_catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_test_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_test_catalog_id_seq OWNED BY public.lab_test_catalog.id;


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    organization_id integer,
    health_system_id integer,
    name text NOT NULL,
    short_name text,
    location_type text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip_code text NOT NULL,
    phone text,
    fax text,
    facility_code text,
    npi text,
    operating_hours jsonb,
    services text[],
    has_lab boolean DEFAULT false,
    has_imaging boolean DEFAULT false,
    has_pharmacy boolean DEFAULT false,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: magic_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_links (
    id integer NOT NULL,
    user_id integer,
    email text NOT NULL,
    token text NOT NULL,
    purpose text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    ip_address text,
    user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: magic_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.magic_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: magic_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.magic_links_id_seq OWNED BY public.magic_links.id;


--
-- Name: marketing_automations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_automations (
    id integer NOT NULL,
    health_system_id integer,
    name text NOT NULL,
    description text,
    automation_type text NOT NULL,
    trigger_conditions jsonb,
    actions jsonb,
    enabled boolean DEFAULT false,
    test_mode boolean DEFAULT true,
    schedule text,
    last_triggered timestamp without time zone,
    last_executed timestamp without time zone,
    execution_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: marketing_automations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketing_automations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketing_automations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketing_automations_id_seq OWNED BY public.marketing_automations.id;


--
-- Name: marketing_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_campaigns (
    id integer NOT NULL,
    health_system_id integer,
    name text NOT NULL,
    description text,
    status text DEFAULT 'draft'::text,
    campaign_type text,
    channel text,
    budget numeric(10,2),
    spent_amount numeric(10,2) DEFAULT '0'::numeric,
    target_audience jsonb,
    performance_metrics jsonb,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: marketing_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketing_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketing_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketing_campaigns_id_seq OWNED BY public.marketing_campaigns.id;


--
-- Name: marketing_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_insights (
    id integer NOT NULL,
    health_system_id integer,
    insight_type text NOT NULL,
    insight_category text,
    title text NOT NULL,
    description text,
    analysis_data jsonb,
    recommendations jsonb,
    status text DEFAULT 'active'::text,
    priority integer DEFAULT 0,
    generated_at timestamp without time zone DEFAULT now(),
    acknowledged_at timestamp without time zone,
    implemented_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: marketing_insights_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketing_insights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketing_insights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketing_insights_id_seq OWNED BY public.marketing_insights.id;


--
-- Name: marketing_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_metrics (
    id integer NOT NULL,
    health_system_id integer,
    metric_date date NOT NULL,
    metric_type text NOT NULL,
    total_visits integer DEFAULT 0,
    unique_visitors integer DEFAULT 0,
    page_views integer DEFAULT 0,
    bounce_rate numeric(5,2),
    avg_session_duration integer,
    signups integer DEFAULT 0,
    trials integer DEFAULT 0,
    paid_conversions integer DEFAULT 0,
    conversion_rate numeric(5,2),
    feature_usage jsonb,
    user_flow_data jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: marketing_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketing_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketing_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketing_metrics_id_seq OWNED BY public.marketing_metrics.id;


--
-- Name: medical_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_history (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    condition_category text NOT NULL,
    history_text text NOT NULL,
    last_updated_encounter_id integer,
    source_type text DEFAULT 'manual_entry'::text,
    source_confidence numeric(3,2) DEFAULT 1.00,
    source_notes text,
    extracted_from_attachment_id integer,
    entered_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: medical_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medical_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medical_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medical_history_id_seq OWNED BY public.medical_history.id;


--
-- Name: medical_problems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_problems (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    problem_title text NOT NULL,
    current_icd10_code text,
    problem_status text DEFAULT 'active'::text,
    first_encounter_id integer,
    last_updated_encounter_id integer,
    visit_history jsonb DEFAULT '[]'::jsonb,
    change_log jsonb DEFAULT '[]'::jsonb,
    last_ranked_encounter_id integer,
    ranking_reason text,
    ranking_factors jsonb,
    encounter_id integer,
    icd10_code text,
    snomed_code text,
    onset_date date,
    resolution_date date,
    notes text,
    severity text,
    source_type text,
    source_confidence numeric(5,2),
    extracted_from_attachment_id integer,
    extraction_notes text,
    provider_id integer,
    date_diagnosed date,
    last_updated timestamp without time zone,
    verification_status text,
    verification_date timestamp without time zone,
    verified_by integer,
    clinical_status text,
    body_site text,
    body_site_laterality text,
    category text,
    last_reviewed_date timestamp without time zone,
    reviewed_by integer,
    patient_education_provided boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: medical_problems_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medical_problems_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medical_problems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medical_problems_id_seq OWNED BY public.medical_problems.id;


--
-- Name: medication_formulary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medication_formulary (
    id integer NOT NULL,
    generic_name text NOT NULL,
    brand_names text[],
    common_names text[],
    standard_strengths text[] NOT NULL,
    available_forms text[] NOT NULL,
    form_routes jsonb NOT NULL,
    sig_templates jsonb NOT NULL,
    common_doses text[],
    max_daily_dose text,
    therapeutic_class text NOT NULL,
    indication text NOT NULL,
    black_box_warning text,
    age_restrictions text,
    prescription_type text NOT NULL,
    is_controlled boolean DEFAULT false,
    controlled_schedule text,
    requires_prior_auth boolean DEFAULT false,
    renal_adjustment boolean DEFAULT false,
    hepatic_adjustment boolean DEFAULT false,
    prescription_volume integer DEFAULT 0,
    popularity_rank integer,
    data_source text NOT NULL,
    last_verified timestamp without time zone DEFAULT now(),
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: medication_formulary_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medication_formulary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medication_formulary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medication_formulary_id_seq OWNED BY public.medication_formulary.id;


--
-- Name: medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medications (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    encounter_id integer,
    medication_name text NOT NULL,
    brand_name text,
    generic_name text,
    dosage text NOT NULL,
    strength text,
    dosage_form text,
    route text,
    frequency text NOT NULL,
    quantity integer,
    quantity_unit text,
    days_supply integer,
    refills_remaining integer,
    total_refills integer,
    sig text,
    rxnorm_code text,
    ndc_code text,
    surescripts_id text,
    clinical_indication text,
    source_order_id integer,
    problem_mappings jsonb DEFAULT '[]'::jsonb,
    start_date date NOT NULL,
    end_date date,
    discontinued_date date,
    status text DEFAULT 'active'::text,
    prescriber text,
    prescriber_id integer,
    first_encounter_id integer,
    last_updated_encounter_id integer,
    reason_for_change text,
    medication_history jsonb DEFAULT '[]'::jsonb,
    change_log jsonb DEFAULT '[]'::jsonb,
    visit_history jsonb DEFAULT '[]'::jsonb,
    source_type text,
    source_confidence numeric(3,2),
    source_notes text,
    extracted_from_attachment_id integer,
    entered_by integer,
    grouping_strategy text DEFAULT 'medical_problem'::text,
    related_medications jsonb DEFAULT '[]'::jsonb,
    drug_interactions jsonb DEFAULT '[]'::jsonb,
    pharmacy_order_id text,
    insurance_auth_status text,
    prior_auth_required boolean DEFAULT false,
    dea_schedule text,
    pharmacy_ncpdp_id text,
    transmission_status text,
    transmission_timestamp timestamp without time zone,
    transmission_message_id text,
    transmission_errors jsonb DEFAULT '[]'::jsonb,
    electronic_signature_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: medications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medications_id_seq OWNED BY public.medications.id;


--
-- Name: migration_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migration_invitations (
    id integer NOT NULL,
    invited_user_id integer,
    invited_user_email text NOT NULL,
    target_health_system_id integer NOT NULL,
    created_by_user_id integer NOT NULL,
    invitation_code text NOT NULL,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    accepted_at timestamp without time zone,
    rejected_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: migration_invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migration_invitations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migration_invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migration_invitations_id_seq OWNED BY public.migration_invitations.id;


--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscribers (
    id integer NOT NULL,
    email text NOT NULL,
    name text,
    subscribed_at timestamp without time zone DEFAULT now(),
    unsubscribed_at timestamp without time zone,
    preferences jsonb,
    source text
);


--
-- Name: newsletter_subscribers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.newsletter_subscribers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: newsletter_subscribers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.newsletter_subscribers_id_seq OWNED BY public.newsletter_subscribers.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    encounter_id integer,
    provider_id integer NOT NULL,
    order_type text NOT NULL,
    order_status text DEFAULT 'draft'::text,
    reference_id integer,
    provider_notes text,
    priority text DEFAULT 'routine'::text,
    clinical_indication text,
    medication_name text,
    dosage text,
    quantity integer,
    quantity_unit text,
    sig text,
    refills integer,
    form text,
    route_of_administration text,
    days_supply integer,
    diagnosis_code text,
    requires_prior_auth boolean DEFAULT false,
    prior_auth_number text,
    lab_name text,
    test_name text,
    test_code text,
    specimen_type text,
    fasting_required boolean DEFAULT false,
    study_type text,
    region text,
    laterality text,
    contrast_needed boolean DEFAULT false,
    specialty_type text,
    provider_name text,
    urgency text,
    ordered_by integer,
    ordered_at timestamp without time zone DEFAULT now(),
    approved_by integer,
    approved_at timestamp without time zone,
    prescriber text,
    prescriber_id integer,
    order_date timestamp without time zone DEFAULT now(),
    status text DEFAULT 'pending'::text,
    medication_dosage text,
    medication_route text,
    medication_frequency text,
    medication_duration text,
    medication_quantity integer,
    medication_refills integer,
    lab_test_name text,
    lab_test_code text,
    imaging_study_type text,
    imaging_body_part text,
    referral_specialty text,
    referral_reason text,
    instructions text,
    diagnosis_codes text[],
    ndc_code text,
    route text,
    frequency text,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    indication text,
    imaging_order_id integer,
    external_order_id text,
    body_part text,
    duration text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: organization_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_documents (
    id integer NOT NULL,
    health_system_id integer NOT NULL,
    document_type text NOT NULL,
    document_url text NOT NULL,
    document_name text,
    uploaded_at timestamp without time zone DEFAULT now(),
    uploaded_by integer,
    verified_at timestamp without time zone,
    verified_by integer,
    expires_at timestamp without time zone,
    metadata jsonb
);


--
-- Name: organization_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organization_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organization_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organization_documents_id_seq OWNED BY public.organization_documents.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    health_system_id integer,
    name text NOT NULL,
    short_name text,
    organization_type text NOT NULL,
    region text,
    city text,
    state text,
    zip_code text,
    phone text,
    email text,
    address text,
    npi text,
    tax_id text,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: patient_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_attachments (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    encounter_id integer,
    file_name text NOT NULL,
    original_file_name text NOT NULL,
    file_size integer NOT NULL,
    mime_type text NOT NULL,
    file_extension text NOT NULL,
    file_path text NOT NULL,
    thumbnail_path text,
    category text DEFAULT 'general'::text NOT NULL,
    title text,
    description text,
    tags text[] DEFAULT '{}'::text[],
    uploaded_by integer NOT NULL,
    is_confidential boolean DEFAULT false,
    access_level text DEFAULT 'standard'::text,
    content_hash text,
    processing_status text DEFAULT 'completed'::text,
    virus_scan_status text DEFAULT 'pending'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: patient_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patient_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patient_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_attachments_id_seq OWNED BY public.patient_attachments.id;


--
-- Name: patient_order_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_order_preferences (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    order_type text NOT NULL,
    preferences jsonb,
    standing_orders jsonb,
    lab_delivery_method text DEFAULT 'mock_service'::text,
    lab_service_provider text,
    imaging_delivery_method text DEFAULT 'print_pdf'::text,
    imaging_service_provider text,
    medication_delivery_method text DEFAULT 'preferred_pharmacy'::text,
    preferred_pharmacy text,
    pharmacy_phone text,
    pharmacy_fax text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    last_updated_by integer
);


--
-- Name: patient_order_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patient_order_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patient_order_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_order_preferences_id_seq OWNED BY public.patient_order_preferences.id;


--
-- Name: patient_physical_findings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_physical_findings (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    exam_system text NOT NULL,
    exam_component text,
    finding_text text NOT NULL,
    finding_type text NOT NULL,
    confidence numeric(3,2) NOT NULL,
    confirmed_count integer DEFAULT 0,
    contradicted_count integer DEFAULT 0,
    first_noted_encounter integer NOT NULL,
    last_confirmed_encounter integer,
    last_seen_encounter integer,
    status text DEFAULT 'active'::text,
    gpt_reasoning text,
    clinical_context jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: patient_physical_findings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patient_physical_findings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patient_physical_findings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_physical_findings_id_seq OWNED BY public.patient_physical_findings.id;


--
-- Name: patient_scheduling_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_scheduling_patterns (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    avg_visit_duration numeric(5,2),
    avg_duration_by_type jsonb,
    visit_duration_std_dev numeric(5,2),
    avg_arrival_delta numeric(5,2),
    arrival_consistency numeric(5,2),
    no_show_rate numeric(5,2),
    no_show_by_day_of_week jsonb,
    no_show_by_time_of_day jsonb,
    last_no_show_date date,
    preferred_reminder_time integer,
    response_rate numeric(5,2),
    preferred_contact_method text,
    avg_question_count numeric(5,2),
    portal_message_frequency numeric(5,2),
    requires_interpreter boolean DEFAULT false,
    mobility_issues boolean DEFAULT false,
    cognitive_considerations boolean DEFAULT false,
    last_calculated timestamp without time zone DEFAULT now()
);


--
-- Name: patient_scheduling_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patient_scheduling_patterns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patient_scheduling_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_scheduling_patterns_id_seq OWNED BY public.patient_scheduling_patterns.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    mrn character varying NOT NULL,
    health_system_id integer NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    middle_name text,
    date_of_birth date NOT NULL,
    gender text NOT NULL,
    contact_number text,
    email text,
    address text,
    city text,
    state text,
    zip text,
    phone text,
    phone_type text,
    emergency_contact text,
    emergency_contact_name text,
    emergency_contact_phone text,
    emergency_contact_relationship text,
    preferred_language text DEFAULT 'English'::text,
    race text,
    ethnicity text,
    preferred_location_id integer,
    primary_provider_id integer,
    insurance_primary text,
    insurance_secondary text,
    policy_number text,
    group_number text,
    insurance_provider text,
    insurance_verified boolean DEFAULT false,
    external_id text,
    consent_given boolean DEFAULT false,
    assistant_id text,
    assistant_thread_id text,
    last_chart_summary text,
    chart_last_updated timestamp without time zone,
    active_problems jsonb DEFAULT '[]'::jsonb,
    critical_alerts jsonb DEFAULT '[]'::jsonb,
    data_origin_type text DEFAULT 'emr_direct'::text,
    original_facility_id integer,
    created_by_provider_id integer,
    creation_context text,
    derivative_work_note text,
    migration_consent jsonb DEFAULT '{"consentGiven": false}'::jsonb,
    profile_photo_filename text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    last_accessed_at timestamp without time zone,
    last_accessed_by integer
);


--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: pharmacies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pharmacies (
    id integer NOT NULL,
    ncpdp_id text,
    npi text,
    dea_number text,
    google_place_id text,
    name text NOT NULL,
    dba_name text,
    corporate_name text,
    address text NOT NULL,
    address2 text,
    city text NOT NULL,
    state text NOT NULL,
    zip_code text NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    phone text,
    fax text,
    email text,
    website text,
    hours jsonb DEFAULT '{}'::jsonb,
    is_24_hour boolean DEFAULT false,
    services text[] DEFAULT '{}'::text[],
    accepts_eprescribing boolean DEFAULT true,
    accepts_controlled_substances boolean DEFAULT false,
    preferred_transmission_method text DEFAULT 'surescripts'::text,
    surescripts_version text,
    specialty_types text[] DEFAULT '{}'::text[],
    insurance_networks jsonb DEFAULT '[]'::jsonb,
    preferred_for_conditions text[] DEFAULT '{}'::text[],
    status text DEFAULT 'active'::text,
    verification_status text DEFAULT 'pending'::text,
    last_verified timestamp without time zone,
    health_system_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: pharmacies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pharmacies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pharmacies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pharmacies_id_seq OWNED BY public.pharmacies.id;


--
-- Name: phi_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phi_access_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    user_name text NOT NULL,
    user_role text NOT NULL,
    health_system_id integer NOT NULL,
    location_id integer,
    patient_id integer,
    patient_name text,
    resource_type text NOT NULL,
    resource_id integer NOT NULL,
    action text NOT NULL,
    access_method text NOT NULL,
    http_method text,
    api_endpoint text,
    ip_address text NOT NULL,
    user_agent text,
    session_id text,
    success boolean NOT NULL,
    error_message text,
    response_time integer,
    access_reason text,
    emergency_access boolean DEFAULT false,
    break_glass_reason text,
    accessed_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: phi_access_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.phi_access_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: phi_access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.phi_access_logs_id_seq OWNED BY public.phi_access_logs.id;


--
-- Name: prescription_transmissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_transmissions (
    id integer NOT NULL,
    medication_id integer NOT NULL,
    order_id integer,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    pharmacy_id integer,
    electronic_signature_id integer,
    transmission_type text NOT NULL,
    transmission_method text NOT NULL,
    message_id text,
    ncpdp_transaction_id text,
    ncpdp_version text,
    ncpdp_message_type text,
    status text DEFAULT 'pending'::text NOT NULL,
    status_history jsonb DEFAULT '[]'::jsonb,
    pharmacy_response jsonb DEFAULT '{}'::jsonb,
    pharmacy_notes text,
    error_code text,
    error_message text,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    gpt_analysis jsonb DEFAULT '{}'::jsonb,
    gpt_recommendations text[] DEFAULT '{}'::text[],
    queued_at timestamp without time zone,
    transmitted_at timestamp without time zone,
    acknowledged_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: prescription_transmissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prescription_transmissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prescription_transmissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prescription_transmissions_id_seq OWNED BY public.prescription_transmissions.id;


--
-- Name: problem_rank_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.problem_rank_overrides (
    id integer NOT NULL,
    problem_id integer NOT NULL,
    user_id integer NOT NULL,
    preference_weight text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: problem_rank_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.problem_rank_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: problem_rank_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.problem_rank_overrides_id_seq OWNED BY public.problem_rank_overrides.id;


--
-- Name: provider_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_schedules (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    location_id integer NOT NULL,
    day_of_week integer NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    schedule_type text NOT NULL,
    appointment_types text[],
    slot_duration integer DEFAULT 30,
    buffer_time integer DEFAULT 0,
    max_concurrent_appts integer DEFAULT 1,
    advance_booking_days integer DEFAULT 365,
    cancelation_policy_hours integer DEFAULT 24,
    is_available_for_urgent boolean DEFAULT true,
    allow_double_booking boolean DEFAULT false,
    requires_referral boolean DEFAULT false,
    effective_from date,
    effective_until date,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: provider_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.provider_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: provider_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.provider_schedules_id_seq OWNED BY public.provider_schedules.id;


--
-- Name: provider_scheduling_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_scheduling_patterns (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    location_id integer,
    avg_visit_duration numeric(5,2),
    avg_duration_by_type jsonb,
    avg_duration_by_hour jsonb,
    avg_transition_time numeric(5,2),
    documentation_lag numeric(5,2),
    on_time_percentage numeric(5,2),
    avg_running_behind numeric(5,2),
    catch_up_patterns jsonb,
    preferred_patient_load integer,
    max_complex_visits integer,
    buffer_preferences jsonb,
    last_calculated timestamp without time zone DEFAULT now()
);


--
-- Name: provider_scheduling_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.provider_scheduling_patterns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: provider_scheduling_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.provider_scheduling_patterns_id_seq OWNED BY public.provider_scheduling_patterns.id;


--
-- Name: realtime_schedule_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.realtime_schedule_status (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    location_id integer NOT NULL,
    schedule_date date NOT NULL,
    current_patient_id integer,
    current_appointment_id integer,
    running_behind_minutes integer DEFAULT 0,
    last_update_time timestamp without time zone DEFAULT now(),
    day_started_at timestamp without time zone,
    estimated_catch_up_time text,
    ai_recommendations jsonb
);


--
-- Name: realtime_schedule_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.realtime_schedule_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: realtime_schedule_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.realtime_schedule_status_id_seq OWNED BY public.realtime_schedule_status.id;


--
-- Name: resource_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_bookings (
    id integer NOT NULL,
    resource_id integer NOT NULL,
    appointment_id integer,
    booking_date date NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    status text DEFAULT 'reserved'::text,
    created_at timestamp without time zone DEFAULT now(),
    created_by integer NOT NULL
);


--
-- Name: resource_bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.resource_bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: resource_bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.resource_bookings_id_seq OWNED BY public.resource_bookings.id;


--
-- Name: schedule_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_exceptions (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    location_id integer,
    exception_date date NOT NULL,
    start_time text,
    end_time text,
    exception_type text NOT NULL,
    reason text,
    cancels_existing_appts boolean DEFAULT false,
    allows_emergency_override boolean DEFAULT true,
    is_recurring boolean DEFAULT false,
    recurrence_pattern text,
    created_at timestamp without time zone DEFAULT now(),
    created_by integer NOT NULL
);


--
-- Name: schedule_exceptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schedule_exceptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schedule_exceptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schedule_exceptions_id_seq OWNED BY public.schedule_exceptions.id;


--
-- Name: schedule_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_preferences (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    use_ai_scheduling boolean DEFAULT true,
    ai_aggressiveness numeric(5,2) DEFAULT 50.00,
    preferred_start_time text,
    preferred_end_time text,
    preferred_lunch_time text,
    preferred_lunch_duration integer,
    ideal_patients_per_day integer,
    max_patients_per_day integer,
    preferred_buffer_minutes integer DEFAULT 5,
    max_complex_visits_per_day integer,
    complex_visit_spacing text,
    allow_double_booking boolean DEFAULT false,
    double_booking_rules jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: schedule_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schedule_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schedule_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schedule_preferences_id_seq OWNED BY public.schedule_preferences.id;


--
-- Name: scheduling_ai_factors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduling_ai_factors (
    id integer NOT NULL,
    factor_category text NOT NULL,
    factor_name text NOT NULL,
    factor_description text NOT NULL,
    data_type text NOT NULL,
    default_enabled boolean DEFAULT true,
    default_weight numeric(5,2) DEFAULT 50.00,
    calculation_method text,
    source_table text,
    update_frequency text,
    impact_direction text,
    max_impact_minutes integer,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: scheduling_ai_factors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scheduling_ai_factors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scheduling_ai_factors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scheduling_ai_factors_id_seq OWNED BY public.scheduling_ai_factors.id;


--
-- Name: scheduling_ai_weights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduling_ai_weights (
    id integer NOT NULL,
    factor_id integer,
    factor_name text,
    provider_id integer,
    location_id integer,
    health_system_id integer,
    enabled boolean,
    weight numeric(5,2) NOT NULL,
    is_active boolean DEFAULT true,
    custom_parameters jsonb,
    created_at timestamp without time zone DEFAULT now(),
    created_by integer NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: scheduling_ai_weights_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scheduling_ai_weights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scheduling_ai_weights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scheduling_ai_weights_id_seq OWNED BY public.scheduling_ai_weights.id;


--
-- Name: scheduling_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduling_resources (
    id integer NOT NULL,
    location_id integer NOT NULL,
    resource_type text NOT NULL,
    resource_name text NOT NULL,
    resource_code text,
    capabilities text[],
    capacity integer DEFAULT 1,
    requires_cleaning_minutes integer DEFAULT 0,
    maintenance_schedule jsonb,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: scheduling_resources_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scheduling_resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scheduling_resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scheduling_resources_id_seq OWNED BY public.scheduling_resources.id;


--
-- Name: scheduling_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduling_rules (
    id integer NOT NULL,
    rule_name text NOT NULL,
    rule_type text NOT NULL,
    provider_id integer,
    location_id integer,
    health_system_id integer,
    rule_config jsonb,
    priority integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    created_by integer NOT NULL
);


--
-- Name: scheduling_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scheduling_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scheduling_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scheduling_rules_id_seq OWNED BY public.scheduling_rules.id;


--
-- Name: scheduling_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduling_templates (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    provider_id integer,
    location_id integer,
    health_system_id integer,
    slot_duration integer NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    lunch_start text,
    lunch_duration integer,
    buffer_between_appts integer DEFAULT 0,
    allow_double_booking boolean DEFAULT false,
    max_patients_per_day integer,
    days_of_week integer[],
    is_default boolean DEFAULT false,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    created_by integer NOT NULL
);


--
-- Name: scheduling_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scheduling_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scheduling_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scheduling_templates_id_seq OWNED BY public.scheduling_templates.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: signatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.signatures (
    id integer NOT NULL,
    encounter_id integer NOT NULL,
    signed_by integer NOT NULL,
    signature_type text NOT NULL,
    signed_at timestamp without time zone DEFAULT now(),
    signature_data text,
    ip_address text,
    attestation_text text
);


--
-- Name: signatures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.signatures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: signatures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.signatures_id_seq OWNED BY public.signatures.id;


--
-- Name: signed_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.signed_orders (
    id integer NOT NULL,
    order_id integer NOT NULL,
    patient_id integer NOT NULL,
    encounter_id integer,
    order_type character varying(50) NOT NULL,
    delivery_method character varying(50) NOT NULL,
    delivery_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    delivery_attempts integer DEFAULT 0 NOT NULL,
    last_delivery_attempt timestamp without time zone,
    delivery_error text,
    can_change_delivery boolean DEFAULT true NOT NULL,
    delivery_lock_reason character varying(255),
    original_delivery_method character varying(50) NOT NULL,
    delivery_changes jsonb DEFAULT '[]'::jsonb,
    signed_at timestamp without time zone NOT NULL,
    signed_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: signed_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.signed_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: signed_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.signed_orders_id_seq OWNED BY public.signed_orders.id;


--
-- Name: social_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_history (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    category text NOT NULL,
    details text NOT NULL,
    current_status text NOT NULL,
    history_notes text,
    last_updated_encounter_id integer,
    source_type text DEFAULT 'manual_entry'::text,
    source_confidence numeric(3,2) DEFAULT 1.00,
    extracted_from_attachment_id integer,
    entered_by integer,
    consolidation_reasoning text,
    extraction_notes text,
    visit_history jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: social_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.social_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: social_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.social_history_id_seq OWNED BY public.social_history.id;


--
-- Name: subscription_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_history (
    id integer NOT NULL,
    health_system_id integer NOT NULL,
    previous_tier integer,
    new_tier integer,
    change_type text,
    changed_at timestamp without time zone DEFAULT now(),
    grace_period_ends timestamp without time zone,
    data_expires_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: subscription_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_history_id_seq OWNED BY public.subscription_history.id;


--
-- Name: subscription_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_keys (
    id integer NOT NULL,
    key character varying(20) NOT NULL,
    health_system_id integer NOT NULL,
    key_type text NOT NULL,
    subscription_tier integer NOT NULL,
    status text DEFAULT 'active'::text,
    monthly_price numeric(10,2),
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone NOT NULL,
    used_by integer,
    used_at timestamp without time zone,
    deactivated_by integer,
    deactivated_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: subscription_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_keys_id_seq OWNED BY public.subscription_keys.id;


--
-- Name: surgical_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.surgical_history (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    procedure_name text NOT NULL,
    procedure_date date,
    surgeon_name text,
    facility_name text,
    indication text,
    complications text,
    anesthesia_type text,
    cpt_code text,
    icd10_procedure_code text,
    anatomical_site text,
    laterality text,
    urgency_level text,
    length_of_stay text,
    blood_loss text,
    transfusions_required boolean DEFAULT false,
    implants_hardware text,
    follow_up_required text,
    recovery_status text,
    source_type text DEFAULT 'manual_entry'::text,
    source_confidence numeric(3,2) DEFAULT 1.00,
    extracted_from_attachment_id integer,
    last_updated_encounter_id integer,
    entered_by integer,
    consolidation_reasoning text,
    extraction_notes text,
    visit_history jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: surgical_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.surgical_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: surgical_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.surgical_history_id_seq OWNED BY public.surgical_history.id;


--
-- Name: template_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_shares (
    id integer NOT NULL,
    template_id integer NOT NULL,
    shared_by integer NOT NULL,
    shared_with integer NOT NULL,
    status text DEFAULT 'pending'::text,
    shared_at timestamp without time zone DEFAULT now(),
    responded_at timestamp without time zone,
    share_message text,
    can_modify boolean DEFAULT false,
    active boolean DEFAULT true
);


--
-- Name: template_shares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.template_shares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: template_shares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.template_shares_id_seq OWNED BY public.template_shares.id;


--
-- Name: template_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_versions (
    id integer NOT NULL,
    template_id integer NOT NULL,
    version_number integer NOT NULL,
    change_description text,
    changed_by integer NOT NULL,
    example_note_snapshot text NOT NULL,
    generated_prompt_snapshot text NOT NULL,
    change_type text DEFAULT 'manual'::text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: template_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.template_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: template_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.template_versions_id_seq OWNED BY public.template_versions.id;


--
-- Name: user_acquisition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_acquisition (
    id integer NOT NULL,
    user_id integer,
    health_system_id integer,
    acquisition_date timestamp without time zone DEFAULT now(),
    source text,
    medium text,
    campaign text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    referrer_url text,
    landing_page text,
    first_touch_attribution jsonb,
    last_touch_attribution jsonb,
    is_paid boolean DEFAULT false,
    channel_group text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_acquisition_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_acquisition_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_acquisition_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_acquisition_id_seq OWNED BY public.user_acquisition.id;


--
-- Name: user_assistant_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_assistant_threads (
    id integer NOT NULL,
    user_id integer NOT NULL,
    thread_id text NOT NULL,
    thread_type text NOT NULL,
    is_active boolean DEFAULT true,
    last_interaction timestamp without time zone DEFAULT now(),
    message_count integer DEFAULT 0,
    patterns_learned integer DEFAULT 0,
    confidence_level numeric(3,2) DEFAULT 0.50,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_assistant_threads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_assistant_threads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_assistant_threads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_assistant_threads_id_seq OWNED BY public.user_assistant_threads.id;


--
-- Name: user_cohorts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_cohorts (
    id integer NOT NULL,
    health_system_id integer,
    name text NOT NULL,
    description text,
    cohort_type text NOT NULL,
    cohort_date date NOT NULL,
    cohort_period text,
    segment_criteria jsonb,
    metrics jsonb,
    user_ids integer[],
    user_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_cohorts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_cohorts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_cohorts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_cohorts_id_seq OWNED BY public.user_cohorts.id;


--
-- Name: user_edit_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_edit_patterns (
    id integer NOT NULL,
    user_id integer NOT NULL,
    patient_id integer,
    encounter_id integer,
    original_text text NOT NULL,
    edited_text text NOT NULL,
    section_type text NOT NULL,
    pattern_type text NOT NULL,
    is_user_preference boolean,
    confidence_score numeric(3,2),
    extracted_pattern jsonb,
    applied boolean DEFAULT false,
    reviewed_by_user boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_edit_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_edit_patterns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_edit_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_edit_patterns_id_seq OWNED BY public.user_edit_patterns.id;


--
-- Name: user_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_locations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    location_id integer NOT NULL,
    role_at_location text NOT NULL,
    is_primary boolean DEFAULT false,
    work_schedule jsonb,
    can_schedule boolean DEFAULT true,
    can_view_all_patients boolean DEFAULT true,
    can_create_orders boolean DEFAULT true,
    active boolean DEFAULT true,
    start_date date,
    end_date date,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_locations_id_seq OWNED BY public.user_locations.id;


--
-- Name: user_note_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_note_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    default_soap_template integer,
    default_apso_template integer,
    default_progress_template integer,
    default_h_and_p_template integer,
    default_discharge_template integer,
    default_procedure_template integer,
    last_selected_note_type text DEFAULT 'soap'::text,
    global_ai_learning boolean DEFAULT true,
    learning_aggressiveness text DEFAULT 'moderate'::text,
    remember_last_template boolean DEFAULT true,
    show_template_preview boolean DEFAULT true,
    auto_save_changes boolean DEFAULT true,
    medical_problems_display_threshold integer DEFAULT 100,
    ranking_weights jsonb DEFAULT '{"clinical_severity": 40, "patient_frequency": 20, "clinical_relevance": 10, "treatment_complexity": 30}'::jsonb,
    chart_panel_width integer DEFAULT 400,
    enable_dense_view boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    ai_assistance_mode text DEFAULT 'strict'::text
);


--
-- Name: user_note_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_note_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_note_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_note_preferences_id_seq OWNED BY public.user_note_preferences.id;


--
-- Name: user_note_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_note_templates (
    id integer NOT NULL,
    user_id integer NOT NULL,
    template_name text NOT NULL,
    base_note_type text NOT NULL,
    display_name text NOT NULL,
    is_personal boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_by integer NOT NULL,
    shared_by integer,
    example_note text NOT NULL,
    base_note_text text,
    inline_comments jsonb,
    has_comments boolean DEFAULT false,
    generated_prompt text NOT NULL,
    prompt_version integer DEFAULT 1,
    enable_ai_learning boolean DEFAULT true,
    learning_confidence numeric(3,2) DEFAULT 0.75,
    last_learning_update timestamp without time zone,
    usage_count integer DEFAULT 0,
    last_used timestamp without time zone,
    version integer DEFAULT 1,
    parent_template_id integer,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_note_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_note_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_note_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_note_templates_id_seq OWNED BY public.user_note_templates.id;


--
-- Name: user_problem_list_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_problem_list_preferences (
    user_id integer NOT NULL,
    max_problems_displayed integer DEFAULT 10,
    show_resolved_problems boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_session_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_session_locations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    location_id integer NOT NULL,
    session_id text,
    selected_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    remember_selection boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_session_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_session_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_session_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_session_locations_id_seq OWNED BY public.user_session_locations.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    health_system_id integer NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role text NOT NULL,
    npi text,
    credentials text,
    specialties text[],
    license_number text,
    license_state text,
    bio text,
    profile_image_url text,
    email_verified boolean DEFAULT false,
    email_verification_token text,
    email_verification_expires timestamp without time zone,
    mfa_enabled boolean DEFAULT false,
    mfa_secret text,
    account_status text DEFAULT 'active'::text,
    last_login timestamp without time zone,
    failed_login_attempts integer DEFAULT 0,
    account_locked_until timestamp without time zone,
    require_password_change boolean DEFAULT false,
    baa_accepted boolean DEFAULT false,
    baa_accepted_at timestamp without time zone,
    baa_version text,
    verification_status text DEFAULT 'unverified'::text,
    verified_with_key_id integer,
    verified_at timestamp without time zone,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vitals (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    encounter_id integer,
    recorded_at timestamp without time zone DEFAULT now() NOT NULL,
    recorded_by text NOT NULL,
    entry_type text DEFAULT 'routine'::text NOT NULL,
    systolic_bp integer,
    diastolic_bp integer,
    heart_rate integer,
    temperature numeric,
    weight numeric,
    height numeric,
    bmi numeric,
    oxygen_saturation numeric,
    respiratory_rate integer,
    pain_scale integer,
    blood_glucose integer,
    notes text,
    parsed_from_text boolean DEFAULT false,
    original_text text,
    processing_notes text,
    source_type text DEFAULT 'manual_entry'::text,
    source_confidence numeric(3,2) DEFAULT 1.00,
    source_notes text,
    extracted_from_attachment_id integer,
    extraction_notes text,
    consolidation_reasoning text,
    merged_ids integer[],
    visit_history jsonb DEFAULT '[]'::jsonb,
    entered_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: vitals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vitals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vitals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vitals_id_seq OWNED BY public.vitals.id;


--
-- Name: webauthn_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webauthn_credentials (
    id integer NOT NULL,
    user_id integer NOT NULL,
    credential_id text NOT NULL,
    credential_public_key text NOT NULL,
    counter integer DEFAULT 0 NOT NULL,
    device_type text,
    transports jsonb,
    registered_device text,
    display_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    last_used_at timestamp without time zone
);


--
-- Name: webauthn_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webauthn_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webauthn_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webauthn_credentials_id_seq OWNED BY public.webauthn_credentials.id;


--
-- Name: ab_test_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_assignments ALTER COLUMN id SET DEFAULT nextval('public.ab_test_assignments_id_seq'::regclass);


--
-- Name: ab_tests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_tests ALTER COLUMN id SET DEFAULT nextval('public.ab_tests_id_seq'::regclass);


--
-- Name: ad_campaign_performance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaign_performance ALTER COLUMN id SET DEFAULT nextval('public.ad_campaign_performance_id_seq'::regclass);


--
-- Name: ad_platform_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_platform_accounts ALTER COLUMN id SET DEFAULT nextval('public.ad_platform_accounts_id_seq'::regclass);


--
-- Name: admin_prompt_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_prompt_reviews ALTER COLUMN id SET DEFAULT nextval('public.admin_prompt_reviews_id_seq'::regclass);


--
-- Name: allergies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergies ALTER COLUMN id SET DEFAULT nextval('public.allergies_id_seq'::regclass);


--
-- Name: analytics_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events ALTER COLUMN id SET DEFAULT nextval('public.analytics_events_id_seq'::regclass);


--
-- Name: appointment_duration_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_duration_history ALTER COLUMN id SET DEFAULT nextval('public.appointment_duration_history_id_seq'::regclass);


--
-- Name: appointment_resource_requirements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_resource_requirements ALTER COLUMN id SET DEFAULT nextval('public.appointment_resource_requirements_id_seq'::regclass);


--
-- Name: appointment_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types ALTER COLUMN id SET DEFAULT nextval('public.appointment_types_id_seq'::regclass);


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: archive_access_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archive_access_logs ALTER COLUMN id SET DEFAULT nextval('public.archive_access_logs_id_seq'::regclass);


--
-- Name: archived_attachment_metadata id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_attachment_metadata ALTER COLUMN id SET DEFAULT nextval('public.archived_attachment_metadata_id_seq'::regclass);


--
-- Name: archived_encounters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_encounters ALTER COLUMN id SET DEFAULT nextval('public.archived_encounters_id_seq'::regclass);


--
-- Name: archived_health_systems id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_health_systems ALTER COLUMN id SET DEFAULT nextval('public.archived_health_systems_id_seq'::regclass);


--
-- Name: archived_patients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_patients ALTER COLUMN id SET DEFAULT nextval('public.archived_patients_id_seq'::regclass);


--
-- Name: archived_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_users ALTER COLUMN id SET DEFAULT nextval('public.archived_users_id_seq'::regclass);


--
-- Name: article_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_comments ALTER COLUMN id SET DEFAULT nextval('public.article_comments_id_seq'::regclass);


--
-- Name: article_generation_queue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_generation_queue ALTER COLUMN id SET DEFAULT nextval('public.article_generation_queue_id_seq'::regclass);


--
-- Name: article_revisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_revisions ALTER COLUMN id SET DEFAULT nextval('public.article_revisions_id_seq'::regclass);


--
-- Name: articles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles ALTER COLUMN id SET DEFAULT nextval('public.articles_id_seq'::regclass);


--
-- Name: asymmetric_scheduling_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asymmetric_scheduling_config ALTER COLUMN id SET DEFAULT nextval('public.asymmetric_scheduling_config_id_seq'::regclass);


--
-- Name: attachment_extracted_content id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment_extracted_content ALTER COLUMN id SET DEFAULT nextval('public.attachment_extracted_content_id_seq'::regclass);


--
-- Name: authentication_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authentication_logs ALTER COLUMN id SET DEFAULT nextval('public.authentication_logs_id_seq'::regclass);


--
-- Name: clinic_admin_verifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_admin_verifications ALTER COLUMN id SET DEFAULT nextval('public.clinic_admin_verifications_id_seq'::regclass);


--
-- Name: conversion_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversion_events ALTER COLUMN id SET DEFAULT nextval('public.conversion_events_id_seq'::regclass);


--
-- Name: data_archives id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_archives ALTER COLUMN id SET DEFAULT nextval('public.data_archives_id_seq'::regclass);


--
-- Name: data_modification_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_modification_logs ALTER COLUMN id SET DEFAULT nextval('public.data_modification_logs_id_seq'::regclass);


--
-- Name: diagnoses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses ALTER COLUMN id SET DEFAULT nextval('public.diagnoses_id_seq'::regclass);


--
-- Name: document_processing_queue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_processing_queue ALTER COLUMN id SET DEFAULT nextval('public.document_processing_queue_id_seq'::regclass);


--
-- Name: electronic_signatures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.electronic_signatures ALTER COLUMN id SET DEFAULT nextval('public.electronic_signatures_id_seq'::regclass);


--
-- Name: email_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_notifications ALTER COLUMN id SET DEFAULT nextval('public.email_notifications_id_seq'::regclass);


--
-- Name: emergency_access_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_access_logs ALTER COLUMN id SET DEFAULT nextval('public.emergency_access_logs_id_seq'::regclass);


--
-- Name: encounters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters ALTER COLUMN id SET DEFAULT nextval('public.encounters_id_seq'::regclass);


--
-- Name: external_labs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_labs ALTER COLUMN id SET DEFAULT nextval('public.external_labs_id_seq'::regclass);


--
-- Name: family_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_history ALTER COLUMN id SET DEFAULT nextval('public.family_history_id_seq'::regclass);


--
-- Name: feature_usage_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage_stats ALTER COLUMN id SET DEFAULT nextval('public.feature_usage_stats_id_seq'::regclass);


--
-- Name: gpt_lab_review_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpt_lab_review_notes ALTER COLUMN id SET DEFAULT nextval('public.gpt_lab_review_notes_id_seq'::regclass);


--
-- Name: health_systems id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_systems ALTER COLUMN id SET DEFAULT nextval('public.health_systems_id_seq'::regclass);


--
-- Name: healthcare_marketing_intelligence id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.healthcare_marketing_intelligence ALTER COLUMN id SET DEFAULT nextval('public.healthcare_marketing_intelligence_id_seq'::regclass);


--
-- Name: hl7_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hl7_messages ALTER COLUMN id SET DEFAULT nextval('public.hl7_messages_id_seq'::regclass);


--
-- Name: imaging_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_orders ALTER COLUMN id SET DEFAULT nextval('public.imaging_orders_id_seq'::regclass);


--
-- Name: imaging_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_results ALTER COLUMN id SET DEFAULT nextval('public.imaging_results_id_seq'::regclass);


--
-- Name: lab_interface_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_interface_mappings ALTER COLUMN id SET DEFAULT nextval('public.lab_interface_mappings_id_seq'::regclass);


--
-- Name: lab_order_sets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order_sets ALTER COLUMN id SET DEFAULT nextval('public.lab_order_sets_id_seq'::regclass);


--
-- Name: lab_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders ALTER COLUMN id SET DEFAULT nextval('public.lab_orders_id_seq'::regclass);


--
-- Name: lab_reference_ranges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_reference_ranges ALTER COLUMN id SET DEFAULT nextval('public.lab_reference_ranges_id_seq'::regclass);


--
-- Name: lab_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results ALTER COLUMN id SET DEFAULT nextval('public.lab_results_id_seq'::regclass);


--
-- Name: lab_test_catalog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_catalog ALTER COLUMN id SET DEFAULT nextval('public.lab_test_catalog_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: magic_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_links ALTER COLUMN id SET DEFAULT nextval('public.magic_links_id_seq'::regclass);


--
-- Name: marketing_automations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_automations ALTER COLUMN id SET DEFAULT nextval('public.marketing_automations_id_seq'::regclass);


--
-- Name: marketing_campaigns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns ALTER COLUMN id SET DEFAULT nextval('public.marketing_campaigns_id_seq'::regclass);


--
-- Name: marketing_insights id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_insights ALTER COLUMN id SET DEFAULT nextval('public.marketing_insights_id_seq'::regclass);


--
-- Name: marketing_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_metrics ALTER COLUMN id SET DEFAULT nextval('public.marketing_metrics_id_seq'::regclass);


--
-- Name: medical_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_history ALTER COLUMN id SET DEFAULT nextval('public.medical_history_id_seq'::regclass);


--
-- Name: medical_problems id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_problems ALTER COLUMN id SET DEFAULT nextval('public.medical_problems_id_seq'::regclass);


--
-- Name: medication_formulary id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_formulary ALTER COLUMN id SET DEFAULT nextval('public.medication_formulary_id_seq'::regclass);


--
-- Name: medications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications ALTER COLUMN id SET DEFAULT nextval('public.medications_id_seq'::regclass);


--
-- Name: migration_invitations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_invitations ALTER COLUMN id SET DEFAULT nextval('public.migration_invitations_id_seq'::regclass);


--
-- Name: newsletter_subscribers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers ALTER COLUMN id SET DEFAULT nextval('public.newsletter_subscribers_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: organization_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_documents ALTER COLUMN id SET DEFAULT nextval('public.organization_documents_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: patient_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_attachments ALTER COLUMN id SET DEFAULT nextval('public.patient_attachments_id_seq'::regclass);


--
-- Name: patient_order_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_order_preferences ALTER COLUMN id SET DEFAULT nextval('public.patient_order_preferences_id_seq'::regclass);


--
-- Name: patient_physical_findings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_physical_findings ALTER COLUMN id SET DEFAULT nextval('public.patient_physical_findings_id_seq'::regclass);


--
-- Name: patient_scheduling_patterns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_scheduling_patterns ALTER COLUMN id SET DEFAULT nextval('public.patient_scheduling_patterns_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: pharmacies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacies ALTER COLUMN id SET DEFAULT nextval('public.pharmacies_id_seq'::regclass);


--
-- Name: phi_access_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phi_access_logs ALTER COLUMN id SET DEFAULT nextval('public.phi_access_logs_id_seq'::regclass);


--
-- Name: prescription_transmissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_transmissions ALTER COLUMN id SET DEFAULT nextval('public.prescription_transmissions_id_seq'::regclass);


--
-- Name: problem_rank_overrides id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.problem_rank_overrides ALTER COLUMN id SET DEFAULT nextval('public.problem_rank_overrides_id_seq'::regclass);


--
-- Name: provider_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_schedules ALTER COLUMN id SET DEFAULT nextval('public.provider_schedules_id_seq'::regclass);


--
-- Name: provider_scheduling_patterns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_scheduling_patterns ALTER COLUMN id SET DEFAULT nextval('public.provider_scheduling_patterns_id_seq'::regclass);


--
-- Name: realtime_schedule_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realtime_schedule_status ALTER COLUMN id SET DEFAULT nextval('public.realtime_schedule_status_id_seq'::regclass);


--
-- Name: resource_bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_bookings ALTER COLUMN id SET DEFAULT nextval('public.resource_bookings_id_seq'::regclass);


--
-- Name: schedule_exceptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_exceptions ALTER COLUMN id SET DEFAULT nextval('public.schedule_exceptions_id_seq'::regclass);


--
-- Name: schedule_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_preferences ALTER COLUMN id SET DEFAULT nextval('public.schedule_preferences_id_seq'::regclass);


--
-- Name: scheduling_ai_factors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_ai_factors ALTER COLUMN id SET DEFAULT nextval('public.scheduling_ai_factors_id_seq'::regclass);


--
-- Name: scheduling_ai_weights id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_ai_weights ALTER COLUMN id SET DEFAULT nextval('public.scheduling_ai_weights_id_seq'::regclass);


--
-- Name: scheduling_resources id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_resources ALTER COLUMN id SET DEFAULT nextval('public.scheduling_resources_id_seq'::regclass);


--
-- Name: scheduling_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_rules ALTER COLUMN id SET DEFAULT nextval('public.scheduling_rules_id_seq'::regclass);


--
-- Name: scheduling_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_templates ALTER COLUMN id SET DEFAULT nextval('public.scheduling_templates_id_seq'::regclass);


--
-- Name: signatures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signatures ALTER COLUMN id SET DEFAULT nextval('public.signatures_id_seq'::regclass);


--
-- Name: signed_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signed_orders ALTER COLUMN id SET DEFAULT nextval('public.signed_orders_id_seq'::regclass);


--
-- Name: social_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_history ALTER COLUMN id SET DEFAULT nextval('public.social_history_id_seq'::regclass);


--
-- Name: subscription_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_history ALTER COLUMN id SET DEFAULT nextval('public.subscription_history_id_seq'::regclass);


--
-- Name: subscription_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_keys ALTER COLUMN id SET DEFAULT nextval('public.subscription_keys_id_seq'::regclass);


--
-- Name: surgical_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surgical_history ALTER COLUMN id SET DEFAULT nextval('public.surgical_history_id_seq'::regclass);


--
-- Name: template_shares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_shares ALTER COLUMN id SET DEFAULT nextval('public.template_shares_id_seq'::regclass);


--
-- Name: template_versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_versions ALTER COLUMN id SET DEFAULT nextval('public.template_versions_id_seq'::regclass);


--
-- Name: user_acquisition id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_acquisition ALTER COLUMN id SET DEFAULT nextval('public.user_acquisition_id_seq'::regclass);


--
-- Name: user_assistant_threads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_assistant_threads ALTER COLUMN id SET DEFAULT nextval('public.user_assistant_threads_id_seq'::regclass);


--
-- Name: user_cohorts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_cohorts ALTER COLUMN id SET DEFAULT nextval('public.user_cohorts_id_seq'::regclass);


--
-- Name: user_edit_patterns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_edit_patterns ALTER COLUMN id SET DEFAULT nextval('public.user_edit_patterns_id_seq'::regclass);


--
-- Name: user_locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_locations ALTER COLUMN id SET DEFAULT nextval('public.user_locations_id_seq'::regclass);


--
-- Name: user_note_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_note_preferences_id_seq'::regclass);


--
-- Name: user_note_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_templates ALTER COLUMN id SET DEFAULT nextval('public.user_note_templates_id_seq'::regclass);


--
-- Name: user_session_locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_session_locations ALTER COLUMN id SET DEFAULT nextval('public.user_session_locations_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vitals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals ALTER COLUMN id SET DEFAULT nextval('public.vitals_id_seq'::regclass);


--
-- Name: webauthn_credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webauthn_credentials ALTER COLUMN id SET DEFAULT nextval('public.webauthn_credentials_id_seq'::regclass);


--
-- Name: ab_test_assignments ab_test_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_assignments
    ADD CONSTRAINT ab_test_assignments_pkey PRIMARY KEY (id);


--
-- Name: ab_tests ab_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_tests
    ADD CONSTRAINT ab_tests_pkey PRIMARY KEY (id);


--
-- Name: ad_campaign_performance ad_campaign_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaign_performance
    ADD CONSTRAINT ad_campaign_performance_pkey PRIMARY KEY (id);


--
-- Name: ad_platform_accounts ad_platform_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_platform_accounts
    ADD CONSTRAINT ad_platform_accounts_pkey PRIMARY KEY (id);


--
-- Name: admin_prompt_reviews admin_prompt_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_prompt_reviews
    ADD CONSTRAINT admin_prompt_reviews_pkey PRIMARY KEY (id);


--
-- Name: allergies allergies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergies
    ADD CONSTRAINT allergies_pkey PRIMARY KEY (id);


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: appointment_duration_history appointment_duration_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_duration_history
    ADD CONSTRAINT appointment_duration_history_pkey PRIMARY KEY (id);


--
-- Name: appointment_resource_requirements appointment_resource_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_resource_requirements
    ADD CONSTRAINT appointment_resource_requirements_pkey PRIMARY KEY (id);


--
-- Name: appointment_types appointment_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types
    ADD CONSTRAINT appointment_types_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: archive_access_logs archive_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archive_access_logs
    ADD CONSTRAINT archive_access_logs_pkey PRIMARY KEY (id);


--
-- Name: archived_attachment_metadata archived_attachment_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_attachment_metadata
    ADD CONSTRAINT archived_attachment_metadata_pkey PRIMARY KEY (id);


--
-- Name: archived_encounters archived_encounters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_encounters
    ADD CONSTRAINT archived_encounters_pkey PRIMARY KEY (id);


--
-- Name: archived_health_systems archived_health_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_health_systems
    ADD CONSTRAINT archived_health_systems_pkey PRIMARY KEY (id);


--
-- Name: archived_patients archived_patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_patients
    ADD CONSTRAINT archived_patients_pkey PRIMARY KEY (id);


--
-- Name: archived_users archived_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_users
    ADD CONSTRAINT archived_users_pkey PRIMARY KEY (id);


--
-- Name: article_comments article_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_comments
    ADD CONSTRAINT article_comments_pkey PRIMARY KEY (id);


--
-- Name: article_generation_queue article_generation_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_generation_queue
    ADD CONSTRAINT article_generation_queue_pkey PRIMARY KEY (id);


--
-- Name: article_revisions article_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_revisions
    ADD CONSTRAINT article_revisions_pkey PRIMARY KEY (id);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: articles articles_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_slug_unique UNIQUE (slug);


--
-- Name: asymmetric_scheduling_config asymmetric_scheduling_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asymmetric_scheduling_config
    ADD CONSTRAINT asymmetric_scheduling_config_pkey PRIMARY KEY (id);


--
-- Name: attachment_extracted_content attachment_extracted_content_attachment_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment_extracted_content
    ADD CONSTRAINT attachment_extracted_content_attachment_id_unique UNIQUE (attachment_id);


--
-- Name: attachment_extracted_content attachment_extracted_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment_extracted_content
    ADD CONSTRAINT attachment_extracted_content_pkey PRIMARY KEY (id);


--
-- Name: authentication_logs authentication_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authentication_logs
    ADD CONSTRAINT authentication_logs_pkey PRIMARY KEY (id);


--
-- Name: clinic_admin_verifications clinic_admin_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_admin_verifications
    ADD CONSTRAINT clinic_admin_verifications_pkey PRIMARY KEY (id);


--
-- Name: conversion_events conversion_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversion_events
    ADD CONSTRAINT conversion_events_pkey PRIMARY KEY (id);


--
-- Name: data_archives data_archives_archive_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_archives
    ADD CONSTRAINT data_archives_archive_id_unique UNIQUE (archive_id);


--
-- Name: data_archives data_archives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_archives
    ADD CONSTRAINT data_archives_pkey PRIMARY KEY (id);


--
-- Name: data_modification_logs data_modification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_modification_logs
    ADD CONSTRAINT data_modification_logs_pkey PRIMARY KEY (id);


--
-- Name: diagnoses diagnoses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_pkey PRIMARY KEY (id);


--
-- Name: document_processing_queue document_processing_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_processing_queue
    ADD CONSTRAINT document_processing_queue_pkey PRIMARY KEY (id);


--
-- Name: electronic_signatures electronic_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.electronic_signatures
    ADD CONSTRAINT electronic_signatures_pkey PRIMARY KEY (id);


--
-- Name: email_notifications email_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_pkey PRIMARY KEY (id);


--
-- Name: emergency_access_logs emergency_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_access_logs
    ADD CONSTRAINT emergency_access_logs_pkey PRIMARY KEY (id);


--
-- Name: encounters encounters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_pkey PRIMARY KEY (id);


--
-- Name: external_labs external_labs_lab_identifier_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_labs
    ADD CONSTRAINT external_labs_lab_identifier_unique UNIQUE (lab_identifier);


--
-- Name: external_labs external_labs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_labs
    ADD CONSTRAINT external_labs_pkey PRIMARY KEY (id);


--
-- Name: family_history family_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_history
    ADD CONSTRAINT family_history_pkey PRIMARY KEY (id);


--
-- Name: feature_usage_stats feature_usage_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage_stats
    ADD CONSTRAINT feature_usage_stats_pkey PRIMARY KEY (id);


--
-- Name: gpt_lab_review_notes gpt_lab_review_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpt_lab_review_notes
    ADD CONSTRAINT gpt_lab_review_notes_pkey PRIMARY KEY (id);


--
-- Name: health_systems health_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_systems
    ADD CONSTRAINT health_systems_pkey PRIMARY KEY (id);


--
-- Name: healthcare_marketing_intelligence healthcare_marketing_intelligence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.healthcare_marketing_intelligence
    ADD CONSTRAINT healthcare_marketing_intelligence_pkey PRIMARY KEY (id);


--
-- Name: hl7_messages hl7_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hl7_messages
    ADD CONSTRAINT hl7_messages_pkey PRIMARY KEY (id);


--
-- Name: imaging_orders imaging_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_orders
    ADD CONSTRAINT imaging_orders_pkey PRIMARY KEY (id);


--
-- Name: imaging_results imaging_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_results
    ADD CONSTRAINT imaging_results_pkey PRIMARY KEY (id);


--
-- Name: lab_interface_mappings lab_interface_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_interface_mappings
    ADD CONSTRAINT lab_interface_mappings_pkey PRIMARY KEY (id);


--
-- Name: lab_order_sets lab_order_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order_sets
    ADD CONSTRAINT lab_order_sets_pkey PRIMARY KEY (id);


--
-- Name: lab_order_sets lab_order_sets_set_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order_sets
    ADD CONSTRAINT lab_order_sets_set_code_unique UNIQUE (set_code);


--
-- Name: lab_orders lab_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_pkey PRIMARY KEY (id);


--
-- Name: lab_reference_ranges lab_reference_ranges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_reference_ranges
    ADD CONSTRAINT lab_reference_ranges_pkey PRIMARY KEY (id);


--
-- Name: lab_results lab_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_pkey PRIMARY KEY (id);


--
-- Name: lab_test_catalog lab_test_catalog_loinc_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_catalog
    ADD CONSTRAINT lab_test_catalog_loinc_code_unique UNIQUE (loinc_code);


--
-- Name: lab_test_catalog lab_test_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_catalog
    ADD CONSTRAINT lab_test_catalog_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: magic_links magic_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_links
    ADD CONSTRAINT magic_links_pkey PRIMARY KEY (id);


--
-- Name: magic_links magic_links_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_links
    ADD CONSTRAINT magic_links_token_unique UNIQUE (token);


--
-- Name: marketing_automations marketing_automations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_automations
    ADD CONSTRAINT marketing_automations_pkey PRIMARY KEY (id);


--
-- Name: marketing_campaigns marketing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id);


--
-- Name: marketing_insights marketing_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_insights
    ADD CONSTRAINT marketing_insights_pkey PRIMARY KEY (id);


--
-- Name: marketing_metrics marketing_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_metrics
    ADD CONSTRAINT marketing_metrics_pkey PRIMARY KEY (id);


--
-- Name: medical_history medical_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_history
    ADD CONSTRAINT medical_history_pkey PRIMARY KEY (id);


--
-- Name: medical_problems medical_problems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_problems
    ADD CONSTRAINT medical_problems_pkey PRIMARY KEY (id);


--
-- Name: medication_formulary medication_formulary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_formulary
    ADD CONSTRAINT medication_formulary_pkey PRIMARY KEY (id);


--
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pkey PRIMARY KEY (id);


--
-- Name: migration_invitations migration_invitations_invitation_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_invitations
    ADD CONSTRAINT migration_invitations_invitation_code_unique UNIQUE (invitation_code);


--
-- Name: migration_invitations migration_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_invitations
    ADD CONSTRAINT migration_invitations_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscribers newsletter_subscribers_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_unique UNIQUE (email);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: organization_documents organization_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_documents
    ADD CONSTRAINT organization_documents_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: patient_attachments patient_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_attachments
    ADD CONSTRAINT patient_attachments_pkey PRIMARY KEY (id);


--
-- Name: patient_order_preferences patient_order_preferences_patient_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_order_preferences
    ADD CONSTRAINT patient_order_preferences_patient_id_unique UNIQUE (patient_id);


--
-- Name: patient_order_preferences patient_order_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_order_preferences
    ADD CONSTRAINT patient_order_preferences_pkey PRIMARY KEY (id);


--
-- Name: patient_physical_findings patient_physical_findings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_physical_findings
    ADD CONSTRAINT patient_physical_findings_pkey PRIMARY KEY (id);


--
-- Name: patient_scheduling_patterns patient_scheduling_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_scheduling_patterns
    ADD CONSTRAINT patient_scheduling_patterns_pkey PRIMARY KEY (id);


--
-- Name: patients patients_mrn_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_mrn_unique UNIQUE (mrn);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: pharmacies pharmacies_google_place_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacies
    ADD CONSTRAINT pharmacies_google_place_id_unique UNIQUE (google_place_id);


--
-- Name: pharmacies pharmacies_ncpdp_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacies
    ADD CONSTRAINT pharmacies_ncpdp_id_unique UNIQUE (ncpdp_id);


--
-- Name: pharmacies pharmacies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacies
    ADD CONSTRAINT pharmacies_pkey PRIMARY KEY (id);


--
-- Name: phi_access_logs phi_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phi_access_logs
    ADD CONSTRAINT phi_access_logs_pkey PRIMARY KEY (id);


--
-- Name: prescription_transmissions prescription_transmissions_message_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_transmissions
    ADD CONSTRAINT prescription_transmissions_message_id_unique UNIQUE (message_id);


--
-- Name: prescription_transmissions prescription_transmissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_transmissions
    ADD CONSTRAINT prescription_transmissions_pkey PRIMARY KEY (id);


--
-- Name: problem_rank_overrides problem_rank_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.problem_rank_overrides
    ADD CONSTRAINT problem_rank_overrides_pkey PRIMARY KEY (id);


--
-- Name: provider_schedules provider_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_schedules
    ADD CONSTRAINT provider_schedules_pkey PRIMARY KEY (id);


--
-- Name: provider_scheduling_patterns provider_scheduling_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_scheduling_patterns
    ADD CONSTRAINT provider_scheduling_patterns_pkey PRIMARY KEY (id);


--
-- Name: realtime_schedule_status realtime_schedule_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realtime_schedule_status
    ADD CONSTRAINT realtime_schedule_status_pkey PRIMARY KEY (id);


--
-- Name: resource_bookings resource_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_bookings
    ADD CONSTRAINT resource_bookings_pkey PRIMARY KEY (id);


--
-- Name: schedule_exceptions schedule_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_exceptions
    ADD CONSTRAINT schedule_exceptions_pkey PRIMARY KEY (id);


--
-- Name: schedule_preferences schedule_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_preferences
    ADD CONSTRAINT schedule_preferences_pkey PRIMARY KEY (id);


--
-- Name: schedule_preferences schedule_preferences_provider_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_preferences
    ADD CONSTRAINT schedule_preferences_provider_id_unique UNIQUE (provider_id);


--
-- Name: scheduling_ai_factors scheduling_ai_factors_factor_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_ai_factors
    ADD CONSTRAINT scheduling_ai_factors_factor_name_unique UNIQUE (factor_name);


--
-- Name: scheduling_ai_factors scheduling_ai_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_ai_factors
    ADD CONSTRAINT scheduling_ai_factors_pkey PRIMARY KEY (id);


--
-- Name: scheduling_ai_weights scheduling_ai_weights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_ai_weights
    ADD CONSTRAINT scheduling_ai_weights_pkey PRIMARY KEY (id);


--
-- Name: scheduling_resources scheduling_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_resources
    ADD CONSTRAINT scheduling_resources_pkey PRIMARY KEY (id);


--
-- Name: scheduling_rules scheduling_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_rules
    ADD CONSTRAINT scheduling_rules_pkey PRIMARY KEY (id);


--
-- Name: scheduling_templates scheduling_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_templates
    ADD CONSTRAINT scheduling_templates_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: signatures signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signatures
    ADD CONSTRAINT signatures_pkey PRIMARY KEY (id);


--
-- Name: signed_orders signed_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signed_orders
    ADD CONSTRAINT signed_orders_pkey PRIMARY KEY (id);


--
-- Name: social_history social_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_history
    ADD CONSTRAINT social_history_pkey PRIMARY KEY (id);


--
-- Name: subscription_history subscription_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_history
    ADD CONSTRAINT subscription_history_pkey PRIMARY KEY (id);


--
-- Name: subscription_keys subscription_keys_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_keys
    ADD CONSTRAINT subscription_keys_key_unique UNIQUE (key);


--
-- Name: subscription_keys subscription_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_keys
    ADD CONSTRAINT subscription_keys_pkey PRIMARY KEY (id);


--
-- Name: surgical_history surgical_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surgical_history
    ADD CONSTRAINT surgical_history_pkey PRIMARY KEY (id);


--
-- Name: template_shares template_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_shares
    ADD CONSTRAINT template_shares_pkey PRIMARY KEY (id);


--
-- Name: template_versions template_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_versions
    ADD CONSTRAINT template_versions_pkey PRIMARY KEY (id);


--
-- Name: user_acquisition user_acquisition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_acquisition
    ADD CONSTRAINT user_acquisition_pkey PRIMARY KEY (id);


--
-- Name: user_assistant_threads user_assistant_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_assistant_threads
    ADD CONSTRAINT user_assistant_threads_pkey PRIMARY KEY (id);


--
-- Name: user_assistant_threads user_assistant_threads_thread_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_assistant_threads
    ADD CONSTRAINT user_assistant_threads_thread_id_unique UNIQUE (thread_id);


--
-- Name: user_cohorts user_cohorts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_cohorts
    ADD CONSTRAINT user_cohorts_pkey PRIMARY KEY (id);


--
-- Name: user_edit_patterns user_edit_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_edit_patterns
    ADD CONSTRAINT user_edit_patterns_pkey PRIMARY KEY (id);


--
-- Name: user_locations user_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_locations
    ADD CONSTRAINT user_locations_pkey PRIMARY KEY (id);


--
-- Name: user_note_preferences user_note_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_preferences
    ADD CONSTRAINT user_note_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_note_preferences user_note_preferences_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_preferences
    ADD CONSTRAINT user_note_preferences_user_id_unique UNIQUE (user_id);


--
-- Name: user_note_templates user_note_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_templates
    ADD CONSTRAINT user_note_templates_pkey PRIMARY KEY (id);


--
-- Name: user_problem_list_preferences user_problem_list_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_problem_list_preferences
    ADD CONSTRAINT user_problem_list_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: user_session_locations user_session_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_session_locations
    ADD CONSTRAINT user_session_locations_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_npi_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_npi_unique UNIQUE (npi);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: vitals vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_credential_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_credential_id_unique UNIQUE (credential_id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webauthn_credentials_created_idx ON public.webauthn_credentials USING btree (created_at);


--
-- Name: webauthn_credentials_credential_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webauthn_credentials_credential_idx ON public.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webauthn_credentials_user_idx ON public.webauthn_credentials USING btree (user_id);


--
-- Name: ab_test_assignments ab_test_assignments_test_id_ab_tests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_assignments
    ADD CONSTRAINT ab_test_assignments_test_id_ab_tests_id_fk FOREIGN KEY (test_id) REFERENCES public.ab_tests(id);


--
-- Name: ab_test_assignments ab_test_assignments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_assignments
    ADD CONSTRAINT ab_test_assignments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ab_tests ab_tests_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_tests
    ADD CONSTRAINT ab_tests_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: ad_campaign_performance ad_campaign_performance_account_id_ad_platform_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaign_performance
    ADD CONSTRAINT ad_campaign_performance_account_id_ad_platform_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.ad_platform_accounts(id);


--
-- Name: ad_campaign_performance ad_campaign_performance_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaign_performance
    ADD CONSTRAINT ad_campaign_performance_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: ad_platform_accounts ad_platform_accounts_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_platform_accounts
    ADD CONSTRAINT ad_platform_accounts_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: admin_prompt_reviews admin_prompt_reviews_admin_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_prompt_reviews
    ADD CONSTRAINT admin_prompt_reviews_admin_user_id_users_id_fk FOREIGN KEY (admin_user_id) REFERENCES public.users(id);


--
-- Name: admin_prompt_reviews admin_prompt_reviews_template_id_user_note_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_prompt_reviews
    ADD CONSTRAINT admin_prompt_reviews_template_id_user_note_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.user_note_templates(id);


--
-- Name: allergies allergies_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergies
    ADD CONSTRAINT allergies_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: allergies allergies_entered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergies
    ADD CONSTRAINT allergies_entered_by_users_id_fk FOREIGN KEY (entered_by) REFERENCES public.users(id);


--
-- Name: allergies allergies_extracted_from_attachment_id_patient_attachments_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergies
    ADD CONSTRAINT allergies_extracted_from_attachment_id_patient_attachments_id_f FOREIGN KEY (extracted_from_attachment_id) REFERENCES public.patient_attachments(id);


--
-- Name: allergies allergies_last_updated_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergies
    ADD CONSTRAINT allergies_last_updated_encounter_id_encounters_id_fk FOREIGN KEY (last_updated_encounter_id) REFERENCES public.encounters(id);


--
-- Name: allergies allergies_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergies
    ADD CONSTRAINT allergies_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: allergies allergies_verified_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allergies
    ADD CONSTRAINT allergies_verified_by_users_id_fk FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: analytics_events analytics_events_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: analytics_events analytics_events_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: appointment_duration_history appointment_duration_history_appointment_id_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_duration_history
    ADD CONSTRAINT appointment_duration_history_appointment_id_appointments_id_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: appointment_types appointment_types_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types
    ADD CONSTRAINT appointment_types_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: appointment_types appointment_types_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types
    ADD CONSTRAINT appointment_types_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: appointments appointments_appointment_type_id_appointment_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_appointment_type_id_appointment_types_id_fk FOREIGN KEY (appointment_type_id) REFERENCES public.appointment_types(id);


--
-- Name: appointments appointments_cancelled_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_cancelled_by_users_id_fk FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: appointments appointments_checked_in_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_checked_in_by_users_id_fk FOREIGN KEY (checked_in_by) REFERENCES public.users(id);


--
-- Name: appointments appointments_completed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_completed_by_users_id_fk FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: appointments appointments_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: appointments appointments_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: appointments appointments_parent_appointment_id_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_parent_appointment_id_appointments_id_fk FOREIGN KEY (parent_appointment_id) REFERENCES public.appointments(id);


--
-- Name: appointments appointments_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: appointments appointments_rescheduled_from_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_rescheduled_from_appointments_id_fk FOREIGN KEY (rescheduled_from) REFERENCES public.appointments(id);


--
-- Name: appointments appointments_verified_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_verified_by_users_id_fk FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: article_comments article_comments_article_id_articles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_comments
    ADD CONSTRAINT article_comments_article_id_articles_id_fk FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: article_comments article_comments_parent_id_article_comments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_comments
    ADD CONSTRAINT article_comments_parent_id_article_comments_id_fk FOREIGN KEY (parent_id) REFERENCES public.article_comments(id);


--
-- Name: article_generation_queue article_generation_queue_generated_article_id_articles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_generation_queue
    ADD CONSTRAINT article_generation_queue_generated_article_id_articles_id_fk FOREIGN KEY (generated_article_id) REFERENCES public.articles(id);


--
-- Name: article_revisions article_revisions_article_id_articles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_revisions
    ADD CONSTRAINT article_revisions_article_id_articles_id_fk FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: article_revisions article_revisions_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_revisions
    ADD CONSTRAINT article_revisions_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: articles articles_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: asymmetric_scheduling_config asymmetric_scheduling_config_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asymmetric_scheduling_config
    ADD CONSTRAINT asymmetric_scheduling_config_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: asymmetric_scheduling_config asymmetric_scheduling_config_health_system_id_health_systems_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asymmetric_scheduling_config
    ADD CONSTRAINT asymmetric_scheduling_config_health_system_id_health_systems_id FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: asymmetric_scheduling_config asymmetric_scheduling_config_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asymmetric_scheduling_config
    ADD CONSTRAINT asymmetric_scheduling_config_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: asymmetric_scheduling_config asymmetric_scheduling_config_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asymmetric_scheduling_config
    ADD CONSTRAINT asymmetric_scheduling_config_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: attachment_extracted_content attachment_extracted_content_attachment_id_patient_attachments_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment_extracted_content
    ADD CONSTRAINT attachment_extracted_content_attachment_id_patient_attachments_ FOREIGN KEY (attachment_id) REFERENCES public.patient_attachments(id);


--
-- Name: authentication_logs authentication_logs_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authentication_logs
    ADD CONSTRAINT authentication_logs_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: authentication_logs authentication_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authentication_logs
    ADD CONSTRAINT authentication_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: clinic_admin_verifications clinic_admin_verifications_approved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_admin_verifications
    ADD CONSTRAINT clinic_admin_verifications_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: clinic_admin_verifications clinic_admin_verifications_health_system_id_health_systems_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_admin_verifications
    ADD CONSTRAINT clinic_admin_verifications_health_system_id_health_systems_id_f FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: conversion_events conversion_events_acquisition_id_user_acquisition_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversion_events
    ADD CONSTRAINT conversion_events_acquisition_id_user_acquisition_id_fk FOREIGN KEY (acquisition_id) REFERENCES public.user_acquisition(id);


--
-- Name: conversion_events conversion_events_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversion_events
    ADD CONSTRAINT conversion_events_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: conversion_events conversion_events_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversion_events
    ADD CONSTRAINT conversion_events_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: data_modification_logs data_modification_logs_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_modification_logs
    ADD CONSTRAINT data_modification_logs_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: data_modification_logs data_modification_logs_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_modification_logs
    ADD CONSTRAINT data_modification_logs_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: data_modification_logs data_modification_logs_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_modification_logs
    ADD CONSTRAINT data_modification_logs_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: data_modification_logs data_modification_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_modification_logs
    ADD CONSTRAINT data_modification_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: data_modification_logs data_modification_logs_validated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_modification_logs
    ADD CONSTRAINT data_modification_logs_validated_by_users_id_fk FOREIGN KEY (validated_by) REFERENCES public.users(id);


--
-- Name: diagnoses diagnoses_clinician_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_clinician_id_users_id_fk FOREIGN KEY (clinician_id) REFERENCES public.users(id);


--
-- Name: diagnoses diagnoses_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: diagnoses diagnoses_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: document_processing_queue document_processing_queue_attachment_id_patient_attachments_id_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_processing_queue
    ADD CONSTRAINT document_processing_queue_attachment_id_patient_attachments_id_ FOREIGN KEY (attachment_id) REFERENCES public.patient_attachments(id);


--
-- Name: electronic_signatures electronic_signatures_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.electronic_signatures
    ADD CONSTRAINT electronic_signatures_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: electronic_signatures electronic_signatures_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.electronic_signatures
    ADD CONSTRAINT electronic_signatures_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: email_notifications email_notifications_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: email_notifications email_notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: emergency_access_logs emergency_access_logs_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_access_logs
    ADD CONSTRAINT emergency_access_logs_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: emergency_access_logs emergency_access_logs_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_access_logs
    ADD CONSTRAINT emergency_access_logs_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: emergency_access_logs emergency_access_logs_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_access_logs
    ADD CONSTRAINT emergency_access_logs_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: emergency_access_logs emergency_access_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_access_logs
    ADD CONSTRAINT emergency_access_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: encounters encounters_appointment_id_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_appointment_id_appointments_id_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: encounters encounters_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: encounters encounters_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: encounters encounters_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: encounters encounters_signature_id_signatures_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_signature_id_signatures_id_fk FOREIGN KEY (signature_id) REFERENCES public.signatures(id);


--
-- Name: encounters encounters_signed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_signed_by_users_id_fk FOREIGN KEY (signed_by) REFERENCES public.users(id);


--
-- Name: family_history family_history_extracted_from_attachment_id_patient_attachments; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_history
    ADD CONSTRAINT family_history_extracted_from_attachment_id_patient_attachments FOREIGN KEY (extracted_from_attachment_id) REFERENCES public.patient_attachments(id);


--
-- Name: family_history family_history_last_updated_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_history
    ADD CONSTRAINT family_history_last_updated_encounter_id_encounters_id_fk FOREIGN KEY (last_updated_encounter_id) REFERENCES public.encounters(id);


--
-- Name: family_history family_history_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_history
    ADD CONSTRAINT family_history_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: feature_usage_stats feature_usage_stats_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage_stats
    ADD CONSTRAINT feature_usage_stats_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: feature_usage_stats feature_usage_stats_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_usage_stats
    ADD CONSTRAINT feature_usage_stats_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: gpt_lab_review_notes gpt_lab_review_notes_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpt_lab_review_notes
    ADD CONSTRAINT gpt_lab_review_notes_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: gpt_lab_review_notes gpt_lab_review_notes_generated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpt_lab_review_notes
    ADD CONSTRAINT gpt_lab_review_notes_generated_by_users_id_fk FOREIGN KEY (generated_by) REFERENCES public.users(id);


--
-- Name: gpt_lab_review_notes gpt_lab_review_notes_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpt_lab_review_notes
    ADD CONSTRAINT gpt_lab_review_notes_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: gpt_lab_review_notes gpt_lab_review_notes_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpt_lab_review_notes
    ADD CONSTRAINT gpt_lab_review_notes_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: gpt_lab_review_notes gpt_lab_review_notes_revised_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpt_lab_review_notes
    ADD CONSTRAINT gpt_lab_review_notes_revised_by_users_id_fk FOREIGN KEY (revised_by) REFERENCES public.users(id);


--
-- Name: health_systems health_systems_merged_into_health_system_id_health_systems_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_systems
    ADD CONSTRAINT health_systems_merged_into_health_system_id_health_systems_id_f FOREIGN KEY (merged_into_health_system_id) REFERENCES public.health_systems(id);


--
-- Name: health_systems health_systems_original_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_systems
    ADD CONSTRAINT health_systems_original_provider_id_users_id_fk FOREIGN KEY (original_provider_id) REFERENCES public.users(id);


--
-- Name: healthcare_marketing_intelligence healthcare_marketing_intelligence_health_system_id_health_syste; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.healthcare_marketing_intelligence
    ADD CONSTRAINT healthcare_marketing_intelligence_health_system_id_health_syste FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: hl7_messages hl7_messages_external_lab_id_external_labs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hl7_messages
    ADD CONSTRAINT hl7_messages_external_lab_id_external_labs_id_fk FOREIGN KEY (external_lab_id) REFERENCES public.external_labs(id);


--
-- Name: imaging_orders imaging_orders_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_orders
    ADD CONSTRAINT imaging_orders_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: imaging_orders imaging_orders_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_orders
    ADD CONSTRAINT imaging_orders_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: imaging_orders imaging_orders_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_orders
    ADD CONSTRAINT imaging_orders_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: imaging_results imaging_results_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_results
    ADD CONSTRAINT imaging_results_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: imaging_results imaging_results_extracted_from_attachment_id_patient_attachment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_results
    ADD CONSTRAINT imaging_results_extracted_from_attachment_id_patient_attachment FOREIGN KEY (extracted_from_attachment_id) REFERENCES public.patient_attachments(id);


--
-- Name: imaging_results imaging_results_imaging_order_id_imaging_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_results
    ADD CONSTRAINT imaging_results_imaging_order_id_imaging_orders_id_fk FOREIGN KEY (imaging_order_id) REFERENCES public.imaging_orders(id);


--
-- Name: imaging_results imaging_results_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_results
    ADD CONSTRAINT imaging_results_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_interface_mappings lab_interface_mappings_external_lab_id_external_labs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_interface_mappings
    ADD CONSTRAINT lab_interface_mappings_external_lab_id_external_labs_id_fk FOREIGN KEY (external_lab_id) REFERENCES public.external_labs(id);


--
-- Name: lab_order_sets lab_order_sets_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order_sets
    ADD CONSTRAINT lab_order_sets_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: lab_orders lab_orders_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: lab_orders lab_orders_ordered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_ordered_by_users_id_fk FOREIGN KEY (ordered_by) REFERENCES public.users(id);


--
-- Name: lab_orders lab_orders_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_orders lab_orders_target_lab_id_external_labs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_target_lab_id_external_labs_id_fk FOREIGN KEY (target_lab_id) REFERENCES public.external_labs(id);


--
-- Name: lab_results lab_results_entered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_entered_by_users_id_fk FOREIGN KEY (entered_by) REFERENCES public.users(id);


--
-- Name: lab_results lab_results_external_lab_id_external_labs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_external_lab_id_external_labs_id_fk FOREIGN KEY (external_lab_id) REFERENCES public.external_labs(id);


--
-- Name: lab_results lab_results_extracted_from_attachment_id_patient_attachments_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_extracted_from_attachment_id_patient_attachments_id FOREIGN KEY (extracted_from_attachment_id) REFERENCES public.patient_attachments(id) ON DELETE SET NULL;


--
-- Name: lab_results lab_results_lab_order_id_lab_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_lab_order_id_lab_orders_id_fk FOREIGN KEY (lab_order_id) REFERENCES public.lab_orders(id);


--
-- Name: lab_results lab_results_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_results lab_results_patient_notified_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_patient_notified_by_users_id_fk FOREIGN KEY (patient_notified_by) REFERENCES public.users(id);


--
-- Name: lab_results lab_results_portal_release_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_portal_release_by_users_id_fk FOREIGN KEY (portal_release_by) REFERENCES public.users(id);


--
-- Name: lab_results lab_results_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: lab_test_catalog lab_test_catalog_validated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_catalog
    ADD CONSTRAINT lab_test_catalog_validated_by_users_id_fk FOREIGN KEY (validated_by) REFERENCES public.users(id);


--
-- Name: locations locations_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: locations locations_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: magic_links magic_links_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_links
    ADD CONSTRAINT magic_links_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: marketing_automations marketing_automations_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_automations
    ADD CONSTRAINT marketing_automations_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: marketing_campaigns marketing_campaigns_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: marketing_insights marketing_insights_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_insights
    ADD CONSTRAINT marketing_insights_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: marketing_metrics marketing_metrics_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_metrics
    ADD CONSTRAINT marketing_metrics_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: medical_history medical_history_entered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_history
    ADD CONSTRAINT medical_history_entered_by_users_id_fk FOREIGN KEY (entered_by) REFERENCES public.users(id);


--
-- Name: medical_history medical_history_extracted_from_attachment_id_patient_attachment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_history
    ADD CONSTRAINT medical_history_extracted_from_attachment_id_patient_attachment FOREIGN KEY (extracted_from_attachment_id) REFERENCES public.patient_attachments(id);


--
-- Name: medical_history medical_history_last_updated_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_history
    ADD CONSTRAINT medical_history_last_updated_encounter_id_encounters_id_fk FOREIGN KEY (last_updated_encounter_id) REFERENCES public.encounters(id);


--
-- Name: medical_history medical_history_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_history
    ADD CONSTRAINT medical_history_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medical_problems medical_problems_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_problems
    ADD CONSTRAINT medical_problems_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id) ON DELETE SET NULL;


--
-- Name: medical_problems medical_problems_extracted_from_attachment_id_patient_attachmen; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_problems
    ADD CONSTRAINT medical_problems_extracted_from_attachment_id_patient_attachmen FOREIGN KEY (extracted_from_attachment_id) REFERENCES public.patient_attachments(id);


--
-- Name: medical_problems medical_problems_first_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_problems
    ADD CONSTRAINT medical_problems_first_encounter_id_encounters_id_fk FOREIGN KEY (first_encounter_id) REFERENCES public.encounters(id) ON DELETE SET NULL;


--
-- Name: medical_problems medical_problems_last_ranked_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_problems
    ADD CONSTRAINT medical_problems_last_ranked_encounter_id_encounters_id_fk FOREIGN KEY (last_ranked_encounter_id) REFERENCES public.encounters(id) ON DELETE SET NULL;


--
-- Name: medical_problems medical_problems_last_updated_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_problems
    ADD CONSTRAINT medical_problems_last_updated_encounter_id_encounters_id_fk FOREIGN KEY (last_updated_encounter_id) REFERENCES public.encounters(id) ON DELETE SET NULL;


--
-- Name: medical_problems medical_problems_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_problems
    ADD CONSTRAINT medical_problems_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medical_problems medical_problems_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_problems
    ADD CONSTRAINT medical_problems_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: medical_problems medical_problems_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_problems
    ADD CONSTRAINT medical_problems_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: medical_problems medical_problems_verified_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_problems
    ADD CONSTRAINT medical_problems_verified_by_users_id_fk FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: medications medications_electronic_signature_id_electronic_signatures_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_electronic_signature_id_electronic_signatures_id_fk FOREIGN KEY (electronic_signature_id) REFERENCES public.electronic_signatures(id);


--
-- Name: medications medications_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: medications medications_entered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_entered_by_users_id_fk FOREIGN KEY (entered_by) REFERENCES public.users(id);


--
-- Name: medications medications_extracted_from_attachment_id_patient_attachments_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_extracted_from_attachment_id_patient_attachments_id FOREIGN KEY (extracted_from_attachment_id) REFERENCES public.patient_attachments(id) ON DELETE SET NULL;


--
-- Name: medications medications_first_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_first_encounter_id_encounters_id_fk FOREIGN KEY (first_encounter_id) REFERENCES public.encounters(id) ON DELETE SET NULL;


--
-- Name: medications medications_last_updated_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_last_updated_encounter_id_encounters_id_fk FOREIGN KEY (last_updated_encounter_id) REFERENCES public.encounters(id) ON DELETE SET NULL;


--
-- Name: medications medications_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medications medications_prescriber_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_prescriber_id_users_id_fk FOREIGN KEY (prescriber_id) REFERENCES public.users(id);


--
-- Name: migration_invitations migration_invitations_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_invitations
    ADD CONSTRAINT migration_invitations_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: migration_invitations migration_invitations_invited_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_invitations
    ADD CONSTRAINT migration_invitations_invited_user_id_users_id_fk FOREIGN KEY (invited_user_id) REFERENCES public.users(id);


--
-- Name: migration_invitations migration_invitations_target_health_system_id_health_systems_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_invitations
    ADD CONSTRAINT migration_invitations_target_health_system_id_health_systems_id FOREIGN KEY (target_health_system_id) REFERENCES public.health_systems(id);


--
-- Name: orders orders_approved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: orders orders_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: orders orders_ordered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_ordered_by_users_id_fk FOREIGN KEY (ordered_by) REFERENCES public.users(id);


--
-- Name: orders orders_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: orders orders_prescriber_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_prescriber_id_users_id_fk FOREIGN KEY (prescriber_id) REFERENCES public.users(id);


--
-- Name: orders orders_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: organization_documents organization_documents_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_documents
    ADD CONSTRAINT organization_documents_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: organization_documents organization_documents_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_documents
    ADD CONSTRAINT organization_documents_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: organization_documents organization_documents_verified_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_documents
    ADD CONSTRAINT organization_documents_verified_by_users_id_fk FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: organizations organizations_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: patient_attachments patient_attachments_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_attachments
    ADD CONSTRAINT patient_attachments_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: patient_attachments patient_attachments_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_attachments
    ADD CONSTRAINT patient_attachments_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patient_attachments patient_attachments_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_attachments
    ADD CONSTRAINT patient_attachments_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: patient_order_preferences patient_order_preferences_last_updated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_order_preferences
    ADD CONSTRAINT patient_order_preferences_last_updated_by_users_id_fk FOREIGN KEY (last_updated_by) REFERENCES public.users(id);


--
-- Name: patient_order_preferences patient_order_preferences_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_order_preferences
    ADD CONSTRAINT patient_order_preferences_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patient_order_preferences patient_order_preferences_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_order_preferences
    ADD CONSTRAINT patient_order_preferences_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: patient_physical_findings patient_physical_findings_first_noted_encounter_encounters_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_physical_findings
    ADD CONSTRAINT patient_physical_findings_first_noted_encounter_encounters_id_f FOREIGN KEY (first_noted_encounter) REFERENCES public.encounters(id);


--
-- Name: patient_physical_findings patient_physical_findings_last_confirmed_encounter_encounters_i; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_physical_findings
    ADD CONSTRAINT patient_physical_findings_last_confirmed_encounter_encounters_i FOREIGN KEY (last_confirmed_encounter) REFERENCES public.encounters(id);


--
-- Name: patient_physical_findings patient_physical_findings_last_seen_encounter_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_physical_findings
    ADD CONSTRAINT patient_physical_findings_last_seen_encounter_encounters_id_fk FOREIGN KEY (last_seen_encounter) REFERENCES public.encounters(id);


--
-- Name: patient_physical_findings patient_physical_findings_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_physical_findings
    ADD CONSTRAINT patient_physical_findings_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patient_scheduling_patterns patient_scheduling_patterns_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_scheduling_patterns
    ADD CONSTRAINT patient_scheduling_patterns_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patients patients_created_by_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_created_by_provider_id_users_id_fk FOREIGN KEY (created_by_provider_id) REFERENCES public.users(id);


--
-- Name: patients patients_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: patients patients_last_accessed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_last_accessed_by_users_id_fk FOREIGN KEY (last_accessed_by) REFERENCES public.users(id);


--
-- Name: patients patients_original_facility_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_original_facility_id_health_systems_id_fk FOREIGN KEY (original_facility_id) REFERENCES public.health_systems(id);


--
-- Name: patients patients_preferred_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_preferred_location_id_locations_id_fk FOREIGN KEY (preferred_location_id) REFERENCES public.locations(id);


--
-- Name: patients patients_primary_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_primary_provider_id_users_id_fk FOREIGN KEY (primary_provider_id) REFERENCES public.users(id);


--
-- Name: pharmacies pharmacies_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacies
    ADD CONSTRAINT pharmacies_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: phi_access_logs phi_access_logs_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phi_access_logs
    ADD CONSTRAINT phi_access_logs_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: phi_access_logs phi_access_logs_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phi_access_logs
    ADD CONSTRAINT phi_access_logs_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: phi_access_logs phi_access_logs_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phi_access_logs
    ADD CONSTRAINT phi_access_logs_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: phi_access_logs phi_access_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phi_access_logs
    ADD CONSTRAINT phi_access_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: prescription_transmissions prescription_transmissions_electronic_signature_id_electronic_s; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_transmissions
    ADD CONSTRAINT prescription_transmissions_electronic_signature_id_electronic_s FOREIGN KEY (electronic_signature_id) REFERENCES public.electronic_signatures(id);


--
-- Name: prescription_transmissions prescription_transmissions_medication_id_medications_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_transmissions
    ADD CONSTRAINT prescription_transmissions_medication_id_medications_id_fk FOREIGN KEY (medication_id) REFERENCES public.medications(id);


--
-- Name: prescription_transmissions prescription_transmissions_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_transmissions
    ADD CONSTRAINT prescription_transmissions_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: prescription_transmissions prescription_transmissions_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_transmissions
    ADD CONSTRAINT prescription_transmissions_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: prescription_transmissions prescription_transmissions_pharmacy_id_pharmacies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_transmissions
    ADD CONSTRAINT prescription_transmissions_pharmacy_id_pharmacies_id_fk FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id);


--
-- Name: prescription_transmissions prescription_transmissions_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_transmissions
    ADD CONSTRAINT prescription_transmissions_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: problem_rank_overrides problem_rank_overrides_problem_id_medical_problems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.problem_rank_overrides
    ADD CONSTRAINT problem_rank_overrides_problem_id_medical_problems_id_fk FOREIGN KEY (problem_id) REFERENCES public.medical_problems(id) ON DELETE CASCADE;


--
-- Name: problem_rank_overrides problem_rank_overrides_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.problem_rank_overrides
    ADD CONSTRAINT problem_rank_overrides_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: provider_schedules provider_schedules_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_schedules
    ADD CONSTRAINT provider_schedules_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: provider_schedules provider_schedules_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_schedules
    ADD CONSTRAINT provider_schedules_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: provider_scheduling_patterns provider_scheduling_patterns_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_scheduling_patterns
    ADD CONSTRAINT provider_scheduling_patterns_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: provider_scheduling_patterns provider_scheduling_patterns_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_scheduling_patterns
    ADD CONSTRAINT provider_scheduling_patterns_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: realtime_schedule_status realtime_schedule_status_current_appointment_id_appointments_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realtime_schedule_status
    ADD CONSTRAINT realtime_schedule_status_current_appointment_id_appointments_id FOREIGN KEY (current_appointment_id) REFERENCES public.appointments(id);


--
-- Name: realtime_schedule_status realtime_schedule_status_current_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realtime_schedule_status
    ADD CONSTRAINT realtime_schedule_status_current_patient_id_patients_id_fk FOREIGN KEY (current_patient_id) REFERENCES public.patients(id);


--
-- Name: realtime_schedule_status realtime_schedule_status_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realtime_schedule_status
    ADD CONSTRAINT realtime_schedule_status_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: realtime_schedule_status realtime_schedule_status_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realtime_schedule_status
    ADD CONSTRAINT realtime_schedule_status_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: resource_bookings resource_bookings_appointment_id_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_bookings
    ADD CONSTRAINT resource_bookings_appointment_id_appointments_id_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: resource_bookings resource_bookings_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_bookings
    ADD CONSTRAINT resource_bookings_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: resource_bookings resource_bookings_resource_id_scheduling_resources_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_bookings
    ADD CONSTRAINT resource_bookings_resource_id_scheduling_resources_id_fk FOREIGN KEY (resource_id) REFERENCES public.scheduling_resources(id);


--
-- Name: schedule_exceptions schedule_exceptions_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_exceptions
    ADD CONSTRAINT schedule_exceptions_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: schedule_exceptions schedule_exceptions_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_exceptions
    ADD CONSTRAINT schedule_exceptions_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: schedule_exceptions schedule_exceptions_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_exceptions
    ADD CONSTRAINT schedule_exceptions_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: schedule_preferences schedule_preferences_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_preferences
    ADD CONSTRAINT schedule_preferences_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: scheduling_ai_weights scheduling_ai_weights_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_ai_weights
    ADD CONSTRAINT scheduling_ai_weights_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: scheduling_ai_weights scheduling_ai_weights_factor_id_scheduling_ai_factors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_ai_weights
    ADD CONSTRAINT scheduling_ai_weights_factor_id_scheduling_ai_factors_id_fk FOREIGN KEY (factor_id) REFERENCES public.scheduling_ai_factors(id);


--
-- Name: scheduling_ai_weights scheduling_ai_weights_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_ai_weights
    ADD CONSTRAINT scheduling_ai_weights_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: scheduling_ai_weights scheduling_ai_weights_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_ai_weights
    ADD CONSTRAINT scheduling_ai_weights_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: scheduling_ai_weights scheduling_ai_weights_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_ai_weights
    ADD CONSTRAINT scheduling_ai_weights_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: scheduling_resources scheduling_resources_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_resources
    ADD CONSTRAINT scheduling_resources_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: scheduling_rules scheduling_rules_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_rules
    ADD CONSTRAINT scheduling_rules_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: scheduling_rules scheduling_rules_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_rules
    ADD CONSTRAINT scheduling_rules_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: scheduling_rules scheduling_rules_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_rules
    ADD CONSTRAINT scheduling_rules_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: scheduling_rules scheduling_rules_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_rules
    ADD CONSTRAINT scheduling_rules_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: scheduling_templates scheduling_templates_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_templates
    ADD CONSTRAINT scheduling_templates_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: scheduling_templates scheduling_templates_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_templates
    ADD CONSTRAINT scheduling_templates_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: scheduling_templates scheduling_templates_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_templates
    ADD CONSTRAINT scheduling_templates_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: scheduling_templates scheduling_templates_provider_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_templates
    ADD CONSTRAINT scheduling_templates_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: signatures signatures_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signatures
    ADD CONSTRAINT signatures_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: signatures signatures_signed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signatures
    ADD CONSTRAINT signatures_signed_by_users_id_fk FOREIGN KEY (signed_by) REFERENCES public.users(id);


--
-- Name: signed_orders signed_orders_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signed_orders
    ADD CONSTRAINT signed_orders_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: signed_orders signed_orders_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signed_orders
    ADD CONSTRAINT signed_orders_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: signed_orders signed_orders_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signed_orders
    ADD CONSTRAINT signed_orders_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: signed_orders signed_orders_signed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signed_orders
    ADD CONSTRAINT signed_orders_signed_by_users_id_fk FOREIGN KEY (signed_by) REFERENCES public.users(id);


--
-- Name: social_history social_history_entered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_history
    ADD CONSTRAINT social_history_entered_by_users_id_fk FOREIGN KEY (entered_by) REFERENCES public.users(id);


--
-- Name: social_history social_history_extracted_from_attachment_id_patient_attachments; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_history
    ADD CONSTRAINT social_history_extracted_from_attachment_id_patient_attachments FOREIGN KEY (extracted_from_attachment_id) REFERENCES public.patient_attachments(id);


--
-- Name: social_history social_history_last_updated_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_history
    ADD CONSTRAINT social_history_last_updated_encounter_id_encounters_id_fk FOREIGN KEY (last_updated_encounter_id) REFERENCES public.encounters(id);


--
-- Name: social_history social_history_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_history
    ADD CONSTRAINT social_history_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: subscription_history subscription_history_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_history
    ADD CONSTRAINT subscription_history_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: subscription_keys subscription_keys_deactivated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_keys
    ADD CONSTRAINT subscription_keys_deactivated_by_users_id_fk FOREIGN KEY (deactivated_by) REFERENCES public.users(id);


--
-- Name: subscription_keys subscription_keys_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_keys
    ADD CONSTRAINT subscription_keys_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: subscription_keys subscription_keys_used_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_keys
    ADD CONSTRAINT subscription_keys_used_by_users_id_fk FOREIGN KEY (used_by) REFERENCES public.users(id);


--
-- Name: surgical_history surgical_history_entered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surgical_history
    ADD CONSTRAINT surgical_history_entered_by_users_id_fk FOREIGN KEY (entered_by) REFERENCES public.users(id);


--
-- Name: surgical_history surgical_history_extracted_from_attachment_id_patient_attachmen; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surgical_history
    ADD CONSTRAINT surgical_history_extracted_from_attachment_id_patient_attachmen FOREIGN KEY (extracted_from_attachment_id) REFERENCES public.patient_attachments(id);


--
-- Name: surgical_history surgical_history_last_updated_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surgical_history
    ADD CONSTRAINT surgical_history_last_updated_encounter_id_encounters_id_fk FOREIGN KEY (last_updated_encounter_id) REFERENCES public.encounters(id);


--
-- Name: surgical_history surgical_history_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surgical_history
    ADD CONSTRAINT surgical_history_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: template_shares template_shares_shared_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_shares
    ADD CONSTRAINT template_shares_shared_by_users_id_fk FOREIGN KEY (shared_by) REFERENCES public.users(id);


--
-- Name: template_shares template_shares_shared_with_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_shares
    ADD CONSTRAINT template_shares_shared_with_users_id_fk FOREIGN KEY (shared_with) REFERENCES public.users(id);


--
-- Name: template_shares template_shares_template_id_user_note_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_shares
    ADD CONSTRAINT template_shares_template_id_user_note_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.user_note_templates(id) ON DELETE CASCADE;


--
-- Name: template_versions template_versions_changed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_versions
    ADD CONSTRAINT template_versions_changed_by_users_id_fk FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: template_versions template_versions_template_id_user_note_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_versions
    ADD CONSTRAINT template_versions_template_id_user_note_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.user_note_templates(id) ON DELETE CASCADE;


--
-- Name: user_acquisition user_acquisition_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_acquisition
    ADD CONSTRAINT user_acquisition_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: user_acquisition user_acquisition_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_acquisition
    ADD CONSTRAINT user_acquisition_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_assistant_threads user_assistant_threads_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_assistant_threads
    ADD CONSTRAINT user_assistant_threads_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_cohorts user_cohorts_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_cohorts
    ADD CONSTRAINT user_cohorts_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: user_edit_patterns user_edit_patterns_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_edit_patterns
    ADD CONSTRAINT user_edit_patterns_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id) ON DELETE CASCADE;


--
-- Name: user_edit_patterns user_edit_patterns_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_edit_patterns
    ADD CONSTRAINT user_edit_patterns_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: user_edit_patterns user_edit_patterns_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_edit_patterns
    ADD CONSTRAINT user_edit_patterns_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_locations user_locations_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_locations
    ADD CONSTRAINT user_locations_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: user_locations user_locations_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_locations
    ADD CONSTRAINT user_locations_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_note_preferences user_note_preferences_default_apso_template_user_note_templates; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_preferences
    ADD CONSTRAINT user_note_preferences_default_apso_template_user_note_templates FOREIGN KEY (default_apso_template) REFERENCES public.user_note_templates(id);


--
-- Name: user_note_preferences user_note_preferences_default_discharge_template_user_note_temp; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_preferences
    ADD CONSTRAINT user_note_preferences_default_discharge_template_user_note_temp FOREIGN KEY (default_discharge_template) REFERENCES public.user_note_templates(id);


--
-- Name: user_note_preferences user_note_preferences_default_h_and_p_template_user_note_templa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_preferences
    ADD CONSTRAINT user_note_preferences_default_h_and_p_template_user_note_templa FOREIGN KEY (default_h_and_p_template) REFERENCES public.user_note_templates(id);


--
-- Name: user_note_preferences user_note_preferences_default_procedure_template_user_note_temp; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_preferences
    ADD CONSTRAINT user_note_preferences_default_procedure_template_user_note_temp FOREIGN KEY (default_procedure_template) REFERENCES public.user_note_templates(id);


--
-- Name: user_note_preferences user_note_preferences_default_progress_template_user_note_templ; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_preferences
    ADD CONSTRAINT user_note_preferences_default_progress_template_user_note_templ FOREIGN KEY (default_progress_template) REFERENCES public.user_note_templates(id);


--
-- Name: user_note_preferences user_note_preferences_default_soap_template_user_note_templates; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_preferences
    ADD CONSTRAINT user_note_preferences_default_soap_template_user_note_templates FOREIGN KEY (default_soap_template) REFERENCES public.user_note_templates(id);


--
-- Name: user_note_preferences user_note_preferences_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_preferences
    ADD CONSTRAINT user_note_preferences_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_note_templates user_note_templates_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_templates
    ADD CONSTRAINT user_note_templates_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: user_note_templates user_note_templates_parent_template_id_user_note_templates_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_templates
    ADD CONSTRAINT user_note_templates_parent_template_id_user_note_templates_id_f FOREIGN KEY (parent_template_id) REFERENCES public.user_note_templates(id);


--
-- Name: user_note_templates user_note_templates_shared_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_templates
    ADD CONSTRAINT user_note_templates_shared_by_users_id_fk FOREIGN KEY (shared_by) REFERENCES public.users(id);


--
-- Name: user_note_templates user_note_templates_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_note_templates
    ADD CONSTRAINT user_note_templates_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_problem_list_preferences user_problem_list_preferences_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_problem_list_preferences
    ADD CONSTRAINT user_problem_list_preferences_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_session_locations user_session_locations_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_session_locations
    ADD CONSTRAINT user_session_locations_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: user_session_locations user_session_locations_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_session_locations
    ADD CONSTRAINT user_session_locations_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_health_system_id_health_systems_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_health_system_id_health_systems_id_fk FOREIGN KEY (health_system_id) REFERENCES public.health_systems(id);


--
-- Name: vitals vitals_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: vitals vitals_entered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_entered_by_users_id_fk FOREIGN KEY (entered_by) REFERENCES public.users(id);


--
-- Name: vitals vitals_extracted_from_attachment_id_patient_attachments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_extracted_from_attachment_id_patient_attachments_id_fk FOREIGN KEY (extracted_from_attachment_id) REFERENCES public.patient_attachments(id);


--
-- Name: vitals vitals_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: webauthn_credentials webauthn_credentials_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

