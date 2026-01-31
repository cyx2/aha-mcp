import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { GraphQLClient } from "graphql-request";

const AHA_DOMAIN = process.env.AHA_DOMAIN;
const AHA_API_TOKEN = process.env.AHA_API_TOKEN;
import {
  FEATURE_REF_REGEX,
  REQUIREMENT_REF_REGEX,
  NOTE_REF_REGEX,
  Record,
  FeatureResponse,
  RequirementResponse,
  PageResponse,
  SearchResponse,
} from "./types.js";
import {
  getFeatureQuery,
  getRequirementQuery,
  getPageQuery,
  searchDocumentsQuery,
  introspectFeatureFieldsQuery,
} from "./queries.js";

export class Handlers {
  constructor(private client: GraphQLClient) {}

  async handleGetRecord(request: any) {
    const { reference } = request.params.arguments as { reference: string };

    if (!reference) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Reference number is required"
      );
    }

    try {
      let result: Record | undefined;

      if (FEATURE_REF_REGEX.test(reference)) {
        const data = await this.client.request<FeatureResponse>(
          getFeatureQuery,
          {
            id: reference,
          }
        );
        result = data.feature;
      } else if (REQUIREMENT_REF_REGEX.test(reference)) {
        const data = await this.client.request<RequirementResponse>(
          getRequirementQuery,
          { id: reference }
        );
        result = data.requirement;
      } else {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Invalid reference number format. Expected DEVELOP-123 or ADT-123-1"
        );
      }

      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: `No record found for reference ${reference}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("API Error:", errorMessage);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch record: ${errorMessage}`
      );
    }
  }

  async handleGetPage(request: any) {
    const { reference, includeParent = false } = request.params.arguments as {
      reference: string;
      includeParent?: boolean;
    };

    if (!reference) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Reference number is required"
      );
    }

    if (!NOTE_REF_REGEX.test(reference)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Invalid reference number format. Expected ABC-N-213"
      );
    }

    try {
      const data = await this.client.request<PageResponse>(getPageQuery, {
        id: reference,
        includeParent,
      });

      if (!data.page) {
        return {
          content: [
            {
              type: "text",
              text: `No page found for reference ${reference}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data.page, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("API Error:", errorMessage);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch page: ${errorMessage}`
      );
    }
  }

  async handleSearchDocuments(request: any) {
    const { query, searchableType = "Page" } = request.params.arguments as {
      query: string;
      searchableType?: string;
    };

    if (!query) {
      throw new McpError(ErrorCode.InvalidParams, "Search query is required");
    }

    try {
      const data = await this.client.request<SearchResponse>(
        searchDocumentsQuery,
        {
          query,
          searchableType: [searchableType],
        }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data.searchDocuments, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("API Error:", errorMessage);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to search documents: ${errorMessage}`
      );
    }
  }

  async handleIntrospectFeature() {
    try {
      const data = await this.client.request<any>(introspectFeatureFieldsQuery);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("API Error:", errorMessage);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to introspect: ${errorMessage}`
      );
    }
  }

  async handleGetRecordRest(request: any) {
    const { reference } = request.params.arguments as { reference: string };

    if (!reference) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Reference number is required"
      );
    }

    try {
      const response = await fetch(
        `https://${AHA_DOMAIN}.aha.io/api/v1/features/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${AHA_API_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`REST API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("API Error:", errorMessage);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch record via REST: ${errorMessage}`
      );
    }
  }

  async handleUpdateFeature(request: any) {
    const { reference, fields } = request.params.arguments as {
      reference: string;
      fields: { [key: string]: any };
    };

    if (!reference) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Reference number is required"
      );
    }

    if (!fields || Object.keys(fields).length === 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Fields object is required with at least one field to update"
      );
    }

    try {
      // Separate custom fields from standard fields
      const customFields: { [key: string]: any } = {};
      const standardFields: { [key: string]: any } = {};

      // Known standard fields from Aha! API documentation
      const standardFieldNames = [
        'name', 'workflow_kind', 'workflow_status', 'release', 'description',
        'created_by', 'assigned_to_user', 'tags',
        'initial_estimate_text', 'detailed_estimate_text', 'remaining_estimate_text',
        'initial_estimate', 'detailed_estimate', 'remaining_estimate',
        'start_date', 'due_date', 'release_phase', 'initiative', 'epic',
        'progress_source', 'progress', 'team', 'team_workflow_status',
        'iteration', 'program_increment'
      ];

      for (const [key, value] of Object.entries(fields)) {
        if (standardFieldNames.includes(key)) {
          standardFields[key] = value;
        } else {
          customFields[key] = value;
        }
      }

      const payload: { [key: string]: any } = {
        feature: {
          ...standardFields,
        }
      };

      if (Object.keys(customFields).length > 0) {
        payload.feature.custom_fields = customFields;
      }

      const response = await fetch(
        `https://${AHA_DOMAIN}.aha.io/api/v1/features/${reference}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${AHA_API_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`REST API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("API Error:", errorMessage);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update feature: ${errorMessage}`
      );
    }
  }

  async handleListFeaturesInRelease(request: any) {
    const { releaseReference, perPage = 100 } = request.params.arguments as {
      releaseReference: string;
      perPage?: number;
    };

    if (!releaseReference) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Release reference is required (e.g., ACT-R-14 or ACTIVATION-R-14)"
      );
    }

    try {
      const allFeatures: any[] = [];
      let currentPage = 1;
      let totalPages = 1;

      // Paginate through all results
      while (currentPage <= totalPages) {
        const response = await fetch(
          `https://${AHA_DOMAIN}.aha.io/api/v1/releases/${releaseReference}/features?page=${currentPage}&per_page=${perPage}`,
          {
            headers: {
              Authorization: `Bearer ${AHA_API_TOKEN}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`REST API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.features) {
          allFeatures.push(...data.features);
        }

        if (data.pagination) {
          totalPages = data.pagination.total_pages || 1;
        }

        currentPage++;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              total_count: allFeatures.length,
              features: allFeatures,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("API Error:", errorMessage);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list features in release: ${errorMessage}`
      );
    }
  }

  async handleListReleases(request: any) {
    const { workspacePrefix, name } = request.params.arguments as {
      workspacePrefix: string;
      name?: string;
    };

    if (!workspacePrefix) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Workspace prefix is required (e.g., ACT, ACTIVATION, DEVELOP)"
      );
    }

    try {
      // First, find the product by its reference prefix (paginate through all products)
      const allProducts: any[] = [];
      let productsPage = 1;
      let productsTotalPages = 1;

      while (productsPage <= productsTotalPages) {
        const productsResponse = await fetch(
          `https://${AHA_DOMAIN}.aha.io/api/v1/products?page=${productsPage}&per_page=100`,
          {
            headers: {
              Authorization: `Bearer ${AHA_API_TOKEN}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        if (!productsResponse.ok) {
          throw new Error(`REST API error: ${productsResponse.status} ${productsResponse.statusText}`);
        }

        const productsData = await productsResponse.json();
        
        if (productsData.products) {
          allProducts.push(...productsData.products);
        }

        if (productsData.pagination) {
          productsTotalPages = productsData.pagination.total_pages || 1;
        }

        productsPage++;
      }
      
      // Find the product matching the workspace prefix (case-insensitive)
      const product = allProducts.find((p: any) => 
        p.reference_prefix?.toLowerCase() === workspacePrefix.toLowerCase()
      );

      if (!product) {
        return {
          content: [
            {
              type: "text",
              text: `No workspace found with prefix "${workspacePrefix}". Available workspaces: ${allProducts.map((p: any) => p.reference_prefix).join(", ") || "none"}`,
            },
          ],
        };
      }

      // Now fetch all releases for this product
      const allReleases: any[] = [];
      let currentPage = 1;
      let totalPages = 1;

      while (currentPage <= totalPages) {
        const releasesResponse = await fetch(
          `https://${AHA_DOMAIN}.aha.io/api/v1/products/${product.id}/releases?page=${currentPage}&per_page=100`,
          {
            headers: {
              Authorization: `Bearer ${AHA_API_TOKEN}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        if (!releasesResponse.ok) {
          throw new Error(`REST API error: ${releasesResponse.status} ${releasesResponse.statusText}`);
        }

        const releasesData = await releasesResponse.json();
        
        if (releasesData.releases) {
          allReleases.push(...releasesData.releases);
        }

        if (releasesData.pagination) {
          totalPages = releasesData.pagination.total_pages || 1;
        }

        currentPage++;
      }

      // Filter by name if provided (case-insensitive partial match)
      let filteredReleases = allReleases;
      if (name) {
        const searchName = name.toLowerCase();
        filteredReleases = allReleases.filter((r: any) => 
          r.name?.toLowerCase().includes(searchName)
        );
      }

      // Format the response with useful fields
      const formattedReleases = filteredReleases.map((r: any) => ({
        reference_num: r.reference_num,
        name: r.name,
        start_date: r.start_date,
        release_date: r.release_date,
        parking_lot: r.parking_lot,
        url: r.url,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              workspace: {
                prefix: product.reference_prefix,
                name: product.name,
                id: product.id,
              },
              total_count: formattedReleases.length,
              releases: formattedReleases,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("API Error:", errorMessage);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list releases: ${errorMessage}`
      );
    }
  }
}
