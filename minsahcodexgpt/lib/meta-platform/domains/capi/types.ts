export interface MetaPlatformCapiUserData {
  readonly em?: string | readonly string[];
  readonly ph?: string | readonly string[];
  readonly fn?: string | readonly string[];
  readonly ln?: string | readonly string[];
  readonly ct?: string | readonly string[];
  readonly st?: string | readonly string[];
  readonly zp?: string | readonly string[];
  readonly country?: string | readonly string[];
  readonly external_id?: string | readonly string[];
  readonly fbc?: string;
  readonly fbp?: string;
  readonly client_ip_address?: string;
  readonly client_user_agent?: string;
}

export interface MetaPlatformCapiEvent {
  readonly event_name: string;
  readonly event_time: number;
  readonly event_id: string;
  readonly action_source: 'website' | 'physical_store' | 'phone_call' | 'chat' | 'email' | 'other';
  readonly event_source_url?: string;
  readonly user_data: MetaPlatformCapiUserData;
  readonly custom_data: Readonly<Record<string, unknown>>;
  readonly opt_out?: boolean;
  readonly data_processing_options?: readonly string[];
  readonly data_processing_options_country?: number;
  readonly data_processing_options_state?: number;
}

export interface MetaPlatformCapiRequest {
  readonly data: readonly MetaPlatformCapiEvent[];
  readonly test_event_code?: string;
}

export interface MetaPlatformCapiProviderPayload {
  readonly events_received?: number;
  readonly messages?: readonly string[];
  readonly fbtrace_id?: string;
  readonly id?: string;
  readonly num_processed_entries?: number;
  readonly error?: {
    readonly code?: string | number;
    readonly error_subcode?: string | number;
    readonly message?: string;
    readonly type?: string;
    readonly fbtrace_id?: string;
  };
  readonly [key: string]: unknown;
}

export interface MetaPlatformCapiDeliveryResult {
  readonly ok: boolean;
  readonly status: number;
  readonly responsePayload: MetaPlatformCapiProviderPayload | null;
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly graphApiVersion: string;
  readonly sdkVersion: string;
  readonly credentialVersion: string;
  readonly transport: 'META_PLATFORM_BUSINESS_SDK';
}
