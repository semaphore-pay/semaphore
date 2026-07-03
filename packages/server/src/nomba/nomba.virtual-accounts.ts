import type { NombaHttpClient } from "./nomba.http";
import type {
  CreateVirtualAccountRequest,
  CreateVirtualAccountResponse,
  ExpireVirtualAccountResponse,
  FilterVirtualAccountRequest,
  PaginationParams,
  UpdateVirtualAccountRequest,
  UpdateVirtualAccountResponse,
  VirtualAccountListResults,
  VirtualAccountObject,
} from "./nomba.types";

/**
 * Virtual Accounts — dedicated bank accounts for receiving payments.
 * See: https://developer.nomba.com/nomba-api-reference/virtual-accounts
 */
export class NombaVirtualAccountClient {
  constructor(private readonly http: NombaHttpClient) {}

  /**
   * Create a virtual account. Omit `expiryDate` for a static account that
   * never expires (recurring payments); set it for a one-time/time-bound
   * (dynamic) account.
   */
  create(request: CreateVirtualAccountRequest): Promise<CreateVirtualAccountResponse> {
    return this.http.post<CreateVirtualAccountResponse>("/v1/accounts/virtual", request);
  }

  /** Fetch a virtual account by its accountRef or bank account number. */
  fetch(identifier: string): Promise<VirtualAccountObject> {
    return this.http.get<VirtualAccountObject>(
      `/v1/accounts/virtual/${encodeURIComponent(identifier)}`
    );
  }

  /**
   * Update a virtual account's reference, name, callback URL, or expected
   * amount. May take a few seconds to propagate to other banks.
   */
  update(
    identifier: string,
    request: UpdateVirtualAccountRequest
  ): Promise<UpdateVirtualAccountResponse> {
    return this.http.put<UpdateVirtualAccountResponse>(
      `/v1/accounts/virtual/${encodeURIComponent(identifier)}`,
      request
    );
  }

  /** Expire (deactivate) a virtual account by its accountRef. */
  expire(identifier: string): Promise<ExpireVirtualAccountResponse> {
    return this.http.delete<ExpireVirtualAccountResponse>(
      `/v1/accounts/virtual/${encodeURIComponent(identifier)}`
    );
  }

  /** Filter/search virtual accounts, with cursor-based pagination. */
  filter(
    request: FilterVirtualAccountRequest = {},
    pagination: PaginationParams = {}
  ): Promise<VirtualAccountListResults> {
    return this.http.post<VirtualAccountListResults>("/v1/accounts/virtual/list", request, {
      query: { limit: pagination.limit, cursor: pagination.cursor },
    });
  }
}
