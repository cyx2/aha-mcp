import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { GraphQLClient } from 'graphql-request';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { Handlers } from '../handlers.js';

// Mock environment variables
process.env.AHA_DOMAIN = 'test-domain';
process.env.AHA_API_TOKEN = 'test-token';

// Mock GraphQL client - use any to avoid complex typing issues with graphql-request
const mockRequest = jest.fn<(query: string, variables?: any) => Promise<any>>();
const mockClient = {
  request: mockRequest,
} as unknown as GraphQLClient;

// Mock global fetch
const mockFetch = jest.fn<typeof fetch>();
global.fetch = mockFetch;

describe('Handlers', () => {
  let handlers: Handlers;

  beforeEach(() => {
    handlers = new Handlers(mockClient);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('handleGetRecord', () => {
    describe('Feature references', () => {
      it('should fetch a feature by reference number', async () => {
        const mockFeature = {
          id: '123',
          referenceNum: 'PROJ-1',
          name: 'Test Feature',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          description: { markdownBody: 'Test description' },
          workflowStatus: { id: '1', name: 'In Progress', color: '#00FF00' },
        };

        mockRequest.mockResolvedValueOnce({ feature: mockFeature });

        const result = await handlers.handleGetRecord({
          params: { arguments: { reference: 'PROJ-1' } },
        });

        expect(mockRequest).toHaveBeenCalledTimes(1);
        expect(result.content[0].type).toBe('text');
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.referenceNum).toBe('PROJ-1');
        expect(parsed.name).toBe('Test Feature');
      });

      it('should return not found message for non-existent feature', async () => {
        mockRequest.mockResolvedValueOnce({ feature: null });

        const result = await handlers.handleGetRecord({
          params: { arguments: { reference: 'PROJ-999' } },
        });

        expect(result.content[0].text).toContain('No record found');
      });

      it('should throw error for missing reference', async () => {
        await expect(
          handlers.handleGetRecord({
            params: { arguments: {} },
          })
        ).rejects.toThrow('Reference number is required');
      });
    });

    describe('Requirement references', () => {
      it('should fetch a requirement by reference number', async () => {
        const mockRequirement = {
          id: '456',
          referenceNum: 'PROJ-1-1',
          name: 'Test Requirement',
          workflowStatus: { id: '1', name: 'Done' },
        };

        mockRequest.mockResolvedValueOnce({ requirement: mockRequirement });

        const result = await handlers.handleGetRecord({
          params: { arguments: { reference: 'PROJ-1-1' } },
        });

        expect(mockRequest).toHaveBeenCalledTimes(1);
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.referenceNum).toBe('PROJ-1-1');
      });
    });

    describe('Invalid references', () => {
      it('should throw error for invalid reference format', async () => {
        await expect(
          handlers.handleGetRecord({
            params: { arguments: { reference: 'invalid-ref' } },
          })
        ).rejects.toThrow('Invalid reference number format');
      });

      it('should throw error for reference with lowercase letters', async () => {
        await expect(
          handlers.handleGetRecord({
            params: { arguments: { reference: 'proj-1' } },
          })
        ).rejects.toThrow('Invalid reference number format');
      });
    });

    describe('API errors', () => {
      it('should handle GraphQL API errors gracefully', async () => {
        mockRequest.mockRejectedValueOnce(new Error('Network error'));

        await expect(
          handlers.handleGetRecord({
            params: { arguments: { reference: 'PROJ-1' } },
          })
        ).rejects.toThrow('Failed to fetch record: Network error');
      });

      it('should handle non-Error throws from GraphQL', async () => {
        mockRequest.mockRejectedValueOnce('String error');

        await expect(
          handlers.handleGetRecord({
            params: { arguments: { reference: 'PROJ-1' } },
          })
        ).rejects.toThrow('Failed to fetch record: String error');
      });

      it('should rethrow McpError without wrapping', async () => {
        const mcpError = new McpError(ErrorCode.InvalidRequest, 'Custom MCP error');
        mockRequest.mockRejectedValueOnce(mcpError);

        await expect(
          handlers.handleGetRecord({
            params: { arguments: { reference: 'PROJ-1' } },
          })
        ).rejects.toThrow('Custom MCP error');
      });
    });
  });

  describe('handleGetPage', () => {
    it('should fetch a page by reference number', async () => {
      const mockPage = {
        id: '789',
        referenceNum: 'DOC-N-1',
        name: 'Test Page',
        description: { markdownBody: 'Page content' },
        children: [],
      };

      mockRequest.mockResolvedValueOnce({ page: mockPage });

      const result = await handlers.handleGetPage({
        params: { arguments: { reference: 'DOC-N-1' } },
      });

      expect(mockRequest).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.referenceNum).toBe('DOC-N-1');
      expect(parsed.name).toBe('Test Page');
    });

    it('should include parent when requested', async () => {
      const mockPage = {
        id: '789',
        referenceNum: 'DOC-N-2',
        name: 'Child Page',
        parent: { id: '788', referenceNum: 'DOC-N-1', name: 'Parent Page' },
      };

      mockRequest.mockResolvedValueOnce({ page: mockPage });

      const result = await handlers.handleGetPage({
        params: { arguments: { reference: 'DOC-N-2', includeParent: true } },
      });

      expect(mockRequest).toHaveBeenCalledWith(expect.any(String), {
        id: 'DOC-N-2',
        includeParent: true,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.parent.name).toBe('Parent Page');
    });

    it('should return not found message for non-existent page', async () => {
      mockRequest.mockResolvedValueOnce({ page: null });

      const result = await handlers.handleGetPage({
        params: { arguments: { reference: 'DOC-N-999' } },
      });

      expect(result.content[0].text).toContain('No page found');
    });

    it('should throw error for invalid page reference format', async () => {
      await expect(
        handlers.handleGetPage({
          params: { arguments: { reference: 'PROJ-1' } },
        })
      ).rejects.toThrow('Invalid reference number format');
    });

    it('should throw error for missing reference', async () => {
      await expect(
        handlers.handleGetPage({
          params: { arguments: {} },
        })
      ).rejects.toThrow('Reference number is required');
    });

    it('should handle GraphQL API errors gracefully', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(
        handlers.handleGetPage({
          params: { arguments: { reference: 'DOC-N-1' } },
        })
      ).rejects.toThrow('Failed to fetch page: Connection timeout');
    });

    it('should rethrow McpError without wrapping', async () => {
      const mcpError = new McpError(ErrorCode.InvalidRequest, 'Page MCP error');
      mockRequest.mockRejectedValueOnce(mcpError);

      await expect(
        handlers.handleGetPage({
          params: { arguments: { reference: 'DOC-N-1' } },
        })
      ).rejects.toThrow('Page MCP error');
    });
  });

  describe('handleSearchDocuments', () => {
    it('should search documents with default type', async () => {
      const mockResults = {
        nodes: [
          { name: 'Test Doc', url: 'https://test.aha.io/doc/1', searchableId: '1', searchableType: 'Page' },
        ],
        currentPage: 1,
        totalCount: 1,
        totalPages: 1,
        isLastPage: true,
      };

      mockRequest.mockResolvedValueOnce({ searchDocuments: mockResults });

      const result = await handlers.handleSearchDocuments({
        params: { arguments: { query: 'test' } },
      });

      expect(mockRequest).toHaveBeenCalledWith(expect.any(String), {
        query: 'test',
        searchableType: ['Page'],
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.totalCount).toBe(1);
    });

    it('should search with custom searchable type', async () => {
      const mockResults = {
        nodes: [],
        currentPage: 1,
        totalCount: 0,
        totalPages: 0,
        isLastPage: true,
      };

      mockRequest.mockResolvedValueOnce({ searchDocuments: mockResults });

      await handlers.handleSearchDocuments({
        params: { arguments: { query: 'feature', searchableType: 'Feature' } },
      });

      expect(mockRequest).toHaveBeenCalledWith(expect.any(String), {
        query: 'feature',
        searchableType: ['Feature'],
      });
    });

    it('should throw error for missing query', async () => {
      await expect(
        handlers.handleSearchDocuments({
          params: { arguments: {} },
        })
      ).rejects.toThrow('Search query is required');
    });

    it('should handle GraphQL API errors gracefully', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Search service unavailable'));

      await expect(
        handlers.handleSearchDocuments({
          params: { arguments: { query: 'test' } },
        })
      ).rejects.toThrow('Failed to search documents: Search service unavailable');
    });

    it('should rethrow McpError without wrapping', async () => {
      const mcpError = new McpError(ErrorCode.InvalidRequest, 'Search MCP error');
      mockRequest.mockRejectedValueOnce(mcpError);

      await expect(
        handlers.handleSearchDocuments({
          params: { arguments: { query: 'test' } },
        })
      ).rejects.toThrow('Search MCP error');
    });
  });

  describe('handleIntrospectFeature', () => {
    it('should return feature schema introspection', async () => {
      const mockIntrospection = {
        __type: {
          name: 'Feature',
          fields: [
            { name: 'id', type: { name: 'ID', kind: 'SCALAR' } },
            { name: 'name', type: { name: 'String', kind: 'SCALAR' } },
          ],
        },
      };

      mockRequest.mockResolvedValueOnce(mockIntrospection);

      const result = await handlers.handleIntrospectFeature();

      expect(mockRequest).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.__type.name).toBe('Feature');
    });

    it('should handle GraphQL API errors gracefully', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Introspection disabled'));

      await expect(handlers.handleIntrospectFeature()).rejects.toThrow(
        'Failed to introspect: Introspection disabled'
      );
    });

    it('should rethrow McpError without wrapping', async () => {
      const mcpError = new McpError(ErrorCode.InvalidRequest, 'Introspect MCP error');
      mockRequest.mockRejectedValueOnce(mcpError);

      await expect(handlers.handleIntrospectFeature()).rejects.toThrow('Introspect MCP error');
    });
  });

  describe('handleGetRecordRest', () => {
    it('should fetch a feature via REST API', async () => {
      const mockFeature = {
        feature: {
          id: '123',
          reference_num: 'PROJ-1',
          name: 'Test Feature',
          custom_fields: [{ key: 'go_live_date', value: '2024-06-01' }],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFeature,
      } as Response);

      const result = await handlers.handleGetRecordRest({
        params: { arguments: { reference: 'PROJ-1' } },
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/features/PROJ-1');
      expect((options as RequestInit).headers).toHaveProperty('Authorization');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.feature.reference_num).toBe('PROJ-1');
    });

    it('should throw error for REST API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(
        handlers.handleGetRecordRest({
          params: { arguments: { reference: 'PROJ-999' } },
        })
      ).rejects.toThrow('REST API error: 404 Not Found');
    });

    it('should throw error for missing reference', async () => {
      await expect(
        handlers.handleGetRecordRest({
          params: { arguments: {} },
        })
      ).rejects.toThrow('Reference number is required');
    });

    it('should rethrow McpError without wrapping', async () => {
      const mcpError = new McpError(ErrorCode.InvalidRequest, 'REST MCP error');
      mockFetch.mockRejectedValueOnce(mcpError);

      await expect(
        handlers.handleGetRecordRest({
          params: { arguments: { reference: 'PROJ-1' } },
        })
      ).rejects.toThrow('REST MCP error');
    });
  });

  describe('handleUpdateFeature', () => {
    it('should update feature with standard fields', async () => {
      const mockUpdatedFeature = {
        feature: {
          id: '123',
          reference_num: 'PROJ-1',
          name: 'Updated Feature',
          start_date: '2024-03-01',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedFeature,
      } as Response);

      const result = await handlers.handleUpdateFeature({
        params: {
          arguments: {
            reference: 'PROJ-1',
            fields: { name: 'Updated Feature', start_date: '2024-03-01' },
          },
        },
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/features/PROJ-1');
      expect((options as RequestInit).method).toBe('PUT');
      expect(JSON.parse((options as RequestInit).body as string)).toEqual({
        feature: {
          name: 'Updated Feature',
          start_date: '2024-03-01',
        },
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.feature.name).toBe('Updated Feature');
    });

    it('should update feature with custom fields', async () => {
      const mockUpdatedFeature = {
        feature: {
          id: '123',
          reference_num: 'PROJ-1',
          custom_fields: [{ key: 'go_live_date', value: '2024-06-01' }],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedFeature,
      } as Response);

      await handlers.handleUpdateFeature({
        params: {
          arguments: {
            reference: 'PROJ-1',
            fields: { go_live_date: '2024-06-01' },
          },
        },
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/features/PROJ-1');
      expect((options as RequestInit).method).toBe('PUT');
      expect(JSON.parse((options as RequestInit).body as string)).toEqual({
        feature: {
          custom_fields: { go_live_date: '2024-06-01' },
        },
      });
    });

    it('should update feature with mixed standard and custom fields', async () => {
      const mockUpdatedFeature = {
        feature: { id: '123', reference_num: 'PROJ-1' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedFeature,
      } as Response);

      await handlers.handleUpdateFeature({
        params: {
          arguments: {
            reference: 'PROJ-1',
            fields: {
              name: 'New Name',
              due_date: '2024-12-31',
              release_stage: 'GA',
              go_live_date: '2024-06-01',
            },
          },
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            feature: {
              name: 'New Name',
              due_date: '2024-12-31',
              custom_fields: {
                release_stage: 'GA',
                go_live_date: '2024-06-01',
              },
            },
          }),
        })
      );
    });

    it('should throw error for missing reference', async () => {
      await expect(
        handlers.handleUpdateFeature({
          params: { arguments: { fields: { name: 'Test' } } },
        })
      ).rejects.toThrow('Reference number is required');
    });

    it('should throw error for empty fields', async () => {
      await expect(
        handlers.handleUpdateFeature({
          params: { arguments: { reference: 'PROJ-1', fields: {} } },
        })
      ).rejects.toThrow('Fields object is required');
    });

    it('should throw error for missing fields', async () => {
      await expect(
        handlers.handleUpdateFeature({
          params: { arguments: { reference: 'PROJ-1' } },
        })
      ).rejects.toThrow('Fields object is required');
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        text: async () => 'Invalid field value',
      } as Response);

      await expect(
        handlers.handleUpdateFeature({
          params: {
            arguments: { reference: 'PROJ-1', fields: { name: 'Test' } },
          },
        })
      ).rejects.toThrow('REST API error: 422 Unprocessable Entity');
    });

    it('should rethrow McpError without wrapping', async () => {
      const mcpError = new McpError(ErrorCode.InvalidRequest, 'Update feature MCP error');
      mockFetch.mockRejectedValueOnce(mcpError);

      await expect(
        handlers.handleUpdateFeature({
          params: {
            arguments: { reference: 'PROJ-1', fields: { name: 'Test' } },
          },
        })
      ).rejects.toThrow('Update feature MCP error');
    });
  });

  describe('handleListFeaturesInRelease', () => {
    it('should list features in a release', async () => {
      const mockFeatures = {
        features: [
          { id: '1', reference_num: 'PROJ-1', name: 'Feature 1' },
          { id: '2', reference_num: 'PROJ-2', name: 'Feature 2' },
        ],
        pagination: { total_pages: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFeatures,
      } as Response);

      const result = await handlers.handleListFeaturesInRelease({
        params: { arguments: { releaseReference: 'PROJ-R-1' } },
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/releases/PROJ-R-1/features');
      expect(url).toContain('page=1');
      expect(url).toContain('per_page=100');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_count).toBe(2);
      expect(parsed.features).toHaveLength(2);
    });

    it('should paginate through all features', async () => {
      const mockPage1 = {
        features: [{ id: '1', reference_num: 'PROJ-1', name: 'Feature 1' }],
        pagination: { total_pages: 2 },
      };
      const mockPage2 = {
        features: [{ id: '2', reference_num: 'PROJ-2', name: 'Feature 2' }],
        pagination: { total_pages: 2 },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPage1,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPage2,
        } as Response);

      const result = await handlers.handleListFeaturesInRelease({
        params: { arguments: { releaseReference: 'PROJ-R-1' } },
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_count).toBe(2);
    });

    it('should respect perPage parameter', async () => {
      const mockFeatures = {
        features: [],
        pagination: { total_pages: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFeatures,
      } as Response);

      await handlers.handleListFeaturesInRelease({
        params: { arguments: { releaseReference: 'PROJ-R-1', perPage: 50 } },
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/releases/PROJ-R-1/features');
      expect(url).toContain('per_page=50');
    });

    it('should throw error for missing release reference', async () => {
      await expect(
        handlers.handleListFeaturesInRelease({
          params: { arguments: {} },
        })
      ).rejects.toThrow('Release reference is required');
    });

    it('should handle REST API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(
        handlers.handleListFeaturesInRelease({
          params: { arguments: { releaseReference: 'PROJ-R-999' } },
        })
      ).rejects.toThrow('Failed to list features in release: REST API error: 404 Not Found');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network unreachable'));

      await expect(
        handlers.handleListFeaturesInRelease({
          params: { arguments: { releaseReference: 'PROJ-R-1' } },
        })
      ).rejects.toThrow('Failed to list features in release: Network unreachable');
    });

    it('should rethrow McpError without wrapping', async () => {
      const mcpError = new McpError(ErrorCode.InvalidRequest, 'List features MCP error');
      mockFetch.mockRejectedValueOnce(mcpError);

      await expect(
        handlers.handleListFeaturesInRelease({
          params: { arguments: { releaseReference: 'PROJ-R-1' } },
        })
      ).rejects.toThrow('List features MCP error');
    });
  });

  describe('handleListReleases', () => {
    it('should list releases for a workspace', async () => {
      const mockProducts = {
        products: [
          { id: '100', reference_prefix: 'PROJ', name: 'Test Project' },
        ],
        pagination: { total_pages: 1 },
      };
      const mockReleases = {
        releases: [
          {
            reference_num: 'PROJ-R-1',
            name: 'Q1 2024',
            start_date: '2024-01-01',
            release_date: '2024-03-31',
            parking_lot: false,
            url: 'https://test.aha.io/releases/PROJ-R-1',
          },
        ],
        pagination: { total_pages: 1 },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProducts,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockReleases,
        } as Response);

      const result = await handlers.handleListReleases({
        params: { arguments: { workspacePrefix: 'PROJ' } },
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.workspace.prefix).toBe('PROJ');
      expect(parsed.total_count).toBe(1);
      expect(parsed.releases[0].reference_num).toBe('PROJ-R-1');
    });

    it('should filter releases by name (case-insensitive)', async () => {
      const mockProducts = {
        products: [{ id: '100', reference_prefix: 'PROJ', name: 'Test' }],
        pagination: { total_pages: 1 },
      };
      const mockReleases = {
        releases: [
          { reference_num: 'PROJ-R-1', name: 'FY2027Q1', start_date: '2024-01-01', release_date: '2024-03-31' },
          { reference_num: 'PROJ-R-2', name: 'FY2027Q2', start_date: '2024-04-01', release_date: '2024-06-30' },
          { reference_num: 'PROJ-R-3', name: 'FY2026Q4', start_date: '2023-10-01', release_date: '2023-12-31' },
        ],
        pagination: { total_pages: 1 },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProducts,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockReleases,
        } as Response);

      const result = await handlers.handleListReleases({
        params: { arguments: { workspacePrefix: 'PROJ', name: 'fy2027' } },
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_count).toBe(2);
      expect(parsed.releases.every((r: any) => r.name.includes('FY2027'))).toBe(true);
    });

    it('should handle workspace not found', async () => {
      const mockProducts = {
        products: [{ id: '100', reference_prefix: 'OTHER', name: 'Other' }],
        pagination: { total_pages: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProducts,
      } as Response);

      const result = await handlers.handleListReleases({
        params: { arguments: { workspacePrefix: 'NOTFOUND' } },
      });

      expect(result.content[0].text).toContain('No workspace found');
    });

    it('should handle case-insensitive workspace prefix matching', async () => {
      const mockProducts = {
        products: [{ id: '100', reference_prefix: 'PROJ', name: 'Test' }],
        pagination: { total_pages: 1 },
      };
      const mockReleases = {
        releases: [],
        pagination: { total_pages: 1 },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProducts,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockReleases,
        } as Response);

      const result = await handlers.handleListReleases({
        params: { arguments: { workspacePrefix: 'proj' } },
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.workspace.prefix).toBe('PROJ');
    });

    it('should throw error for missing workspace prefix', async () => {
      await expect(
        handlers.handleListReleases({
          params: { arguments: {} },
        })
      ).rejects.toThrow('Workspace prefix is required');
    });

    it('should handle products API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(
        handlers.handleListReleases({
          params: { arguments: { workspacePrefix: 'PROJ' } },
        })
      ).rejects.toThrow('Failed to list releases: REST API error: 500 Internal Server Error');
    });

    it('should handle releases API errors gracefully', async () => {
      const mockProducts = {
        products: [{ id: '100', reference_prefix: 'PROJ', name: 'Test' }],
        pagination: { total_pages: 1 },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProducts,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
        } as Response);

      await expect(
        handlers.handleListReleases({
          params: { arguments: { workspacePrefix: 'PROJ' } },
        })
      ).rejects.toThrow('Failed to list releases: REST API error: 403 Forbidden');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('DNS resolution failed'));

      await expect(
        handlers.handleListReleases({
          params: { arguments: { workspacePrefix: 'PROJ' } },
        })
      ).rejects.toThrow('Failed to list releases: DNS resolution failed');
    });

    it('should rethrow McpError without wrapping', async () => {
      const mcpError = new McpError(ErrorCode.InvalidRequest, 'List releases MCP error');
      mockFetch.mockRejectedValueOnce(mcpError);

      await expect(
        handlers.handleListReleases({
          params: { arguments: { workspacePrefix: 'PROJ' } },
        })
      ).rejects.toThrow('List releases MCP error');
    });
  });

  describe('handleUpdateRelease', () => {
    it('should update release with date fields', async () => {
      const mockUpdatedRelease = {
        release: {
          reference_num: 'PROJ-R-1',
          name: 'Q1 2024',
          start_date: '2024-02-01',
          release_date: '2024-04-30',
          development_started_on: null,
          parking_lot: false,
          url: 'https://test.aha.io/releases/PROJ-R-1',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedRelease,
      } as Response);

      const result = await handlers.handleUpdateRelease({
        params: {
          arguments: {
            reference: 'PROJ-R-1',
            fields: { start_date: '2024-02-01', release_date: '2024-04-30' },
          },
        },
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/releases/PROJ-R-1');
      expect((options as RequestInit).method).toBe('PUT');
      expect(JSON.parse((options as RequestInit).body as string)).toEqual({
        release: {
          start_date: '2024-02-01',
          release_date: '2024-04-30',
        },
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.message).toBe('Release updated successfully');
      expect(parsed.release.start_date).toBe('2024-02-01');
      expect(parsed.release.release_date).toBe('2024-04-30');
    });

    it('should update release name', async () => {
      const mockUpdatedRelease = {
        release: {
          reference_num: 'PROJ-R-1',
          name: 'New Release Name',
          start_date: '2024-01-01',
          release_date: '2024-03-31',
          parking_lot: false,
          url: 'https://test.aha.io/releases/PROJ-R-1',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedRelease,
      } as Response);

      const result = await handlers.handleUpdateRelease({
        params: {
          arguments: {
            reference: 'PROJ-R-1',
            fields: { name: 'New Release Name' },
          },
        },
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.release.name).toBe('New Release Name');
    });

    it('should update parking_lot status', async () => {
      const mockUpdatedRelease = {
        release: {
          reference_num: 'PROJ-R-1',
          name: 'Parking Lot',
          parking_lot: true,
          url: 'https://test.aha.io/releases/PROJ-R-1',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedRelease,
      } as Response);

      await handlers.handleUpdateRelease({
        params: {
          arguments: {
            reference: 'PROJ-R-1',
            fields: { parking_lot: true },
          },
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            release: { parking_lot: true },
          }),
        })
      );
    });

    it('should throw error for missing reference', async () => {
      await expect(
        handlers.handleUpdateRelease({
          params: { arguments: { fields: { name: 'Test' } } },
        })
      ).rejects.toThrow('Release reference number is required');
    });

    it('should throw error for empty fields', async () => {
      await expect(
        handlers.handleUpdateRelease({
          params: { arguments: { reference: 'PROJ-R-1', fields: {} } },
        })
      ).rejects.toThrow('Fields object is required');
    });

    it('should throw error for missing fields', async () => {
      await expect(
        handlers.handleUpdateRelease({
          params: { arguments: { reference: 'PROJ-R-1' } },
        })
      ).rejects.toThrow('Fields object is required');
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Release not found',
      } as Response);

      await expect(
        handlers.handleUpdateRelease({
          params: {
            arguments: { reference: 'PROJ-R-999', fields: { name: 'Test' } },
          },
        })
      ).rejects.toThrow('REST API error: 404 Not Found');
    });

    it('should handle validation errors from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        text: async () => 'Invalid date format',
      } as Response);

      await expect(
        handlers.handleUpdateRelease({
          params: {
            arguments: {
              reference: 'PROJ-R-1',
              fields: { start_date: 'invalid-date' },
            },
          },
        })
      ).rejects.toThrow('REST API error: 422 Unprocessable Entity');
    });

    it('should rethrow McpError without wrapping', async () => {
      const mcpError = new McpError(ErrorCode.InvalidRequest, 'Update release MCP error');
      mockFetch.mockRejectedValueOnce(mcpError);

      await expect(
        handlers.handleUpdateRelease({
          params: {
            arguments: { reference: 'PROJ-R-1', fields: { name: 'Test' } },
          },
        })
      ).rejects.toThrow('Update release MCP error');
    });
  });
});
