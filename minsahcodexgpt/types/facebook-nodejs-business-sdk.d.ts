declare module 'facebook-nodejs-business-sdk' {
  export class Content {
    constructor(
      id?: string,
      quantity?: number,
      itemPrice?: number,
      title?: string,
      description?: string,
      brand?: string,
      category?: string,
      deliveryCategory?: string
    );
    setId(value: string): this;
    setQuantity(value: number): this;
    setItemPrice(value: number): this;
    setTitle(value: string): this;
    setDescription(value: string): this;
    setBrand(value: string): this;
    setCategory(value: string): this;
    setDeliveryCategory(value: string): this;
    normalize(): Record<string, unknown>;
  }

  export class CustomData {
    setValue(value: number): this;
    setNetRevenue(value: number): this;
    setCurrency(value: string): this;
    setContentName(value: string): this;
    setContentCategory(value: string): this;
    setContentIds(value: string[]): this;
    setContents(value: Content[]): this;
    setContentType(value: string): this;
    setOrderId(value: string): this;
    setPredictedLtv(value: number): this;
    setNumItems(value: number): this;
    setSearchString(value: string): this;
    setItemNumber(value: string): this;
    setDeliveryCategory(value: string): this;
    setCustomProperties(value: Record<string, unknown>): this;
    setStatus(value: string): this;
    normalize(): Record<string, unknown>;
  }

  export class UserData {
    setEmails(value: string[]): this;
    setPhones(value: string[]): this;
    setFirstNames(value: string[]): this;
    setLastNames(value: string[]): this;
    setCities(value: string[]): this;
    setStates(value: string[]): this;
    setZips(value: string[]): this;
    setCountries(value: string[]): this;
    setExternalIds(value: string[]): this;
    setClientIpAddress(value: string): this;
    setClientUserAgent(value: string): this;
    setFbc(value: string): this;
    setFbp(value: string): this;
    normalize(): Record<string, unknown>;
  }

  export class ServerEvent {
    setEventName(value: string): this;
    setEventTime(value: number): this;
    setEventSourceUrl(value: string): this;
    setEventId(value: string): this;
    setActionSource(value: string): this;
    setOptOut(value: boolean): this;
    setUserData(value: UserData): this;
    setCustomData(value: CustomData): this;
    setDataProcessingOptions(value: string[]): this;
    setDataProcessingOptionsCountry(value: number): this;
    setDataProcessingOptionsState(value: number): this;
    normalize(): Record<string, unknown>;
  }

  export interface HttpService {
    executeRequest(
      url: string,
      method: string,
      headers: Record<string, string>,
      params: Record<string, unknown>
    ): Promise<unknown>;
  }

  export class EventRequest {
    constructor(
      accessToken: string,
      pixelId: string,
      events?: ServerEvent[],
      partnerAgent?: string | null,
      testEventCode?: string | null
    );
    setEvents(value: ServerEvent[]): this;
    setPartnerAgent(value: string): this;
    setTestEventCode(value: string): this;
    setDebugMode(value: boolean): this;
    setHttpService(value: HttpService): this;
    execute(): Promise<unknown>;
  }

  export class FacebookAdsApi {
    accessToken: string;
    constructor(accessToken: string, locale?: string, crashLogging?: boolean);
    static SDK_VERSION: string;
    static VERSION: string;
    static GRAPH: string;
    setDebug(enabled: boolean): this;
    call(
      method: string,
      path: string | string[],
      params?: Record<string, unknown>,
      files?: Record<string, unknown>,
      useMultipartFormData?: boolean,
      urlOverride?: string
    ): Promise<unknown>;
  }

}
