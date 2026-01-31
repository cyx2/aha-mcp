export const getPageQuery = `
  query GetPage($id: ID!, $includeParent: Boolean!) {
    page(id: $id) {
      id
      referenceNum
      name
      createdAt
      updatedAt
      description {
        markdownBody
      }
      children {
        id
        referenceNum
        name
      }
      parent @include(if: $includeParent) {
        id
        referenceNum
        name
      }
    }
  }
`;

export const getFeatureQuery = `
  query GetFeature($id: ID!) {
    feature(id: $id) {
      id
      referenceNum
      name
      createdAt
      updatedAt
      startDate
      dueDate
      position
      score
      progress
      remainingEstimate {
        text
        value
        units
      }
      originalEstimate {
        text
        value
        units
      }
      workDone {
        text
        value
        units
      }
      description {
        markdownBody
      }
      workflowStatus {
        id
        name
        color
        position
      }
      release {
        id
        referenceNum
        name
        releaseDate
        startOn
        developmentStartedOn
        customFieldValues {
          key
          value
        }
      }
      assignedToUser {
        id
        name
        email
      }
      createdByUser {
        id
        name
        email
      }
      team {
        id
        name
      }
      project {
        id
        referencePrefix
        name
        customFieldDefinitions {
          key
          name
          type
        }
      }
      initiative {
        id
        referenceNum
        name
      }
      epic {
        id
        referenceNum
        name
      }
      tags {
        id
        name
        color
      }
      requirements {
        id
        referenceNum
        name
        workflowStatus {
          name
        }
      }
      customFieldValues {
        id
        key
        value
        humanValue
      }
      extensionFields {
        id
        name
        value
      }
    }
  }
`;

export const getRequirementQuery = `
  query GetRequirement($id: ID!) {
    requirement(id: $id) {
      id
      referenceNum
      name
      createdAt
      updatedAt
      position
      description {
        markdownBody
      }
      workflowStatus {
        id
        name
        color
        position
      }
      assignedToUser {
        id
        name
        email
      }
      createdByUser {
        id
        name
        email
      }
      team {
        id
        name
      }
      project {
        id
        referencePrefix
        name
      }
      feature {
        id
        referenceNum
        name
        release {
          id
          referenceNum
          name
          releaseDate
          customFieldValues {
            key
            value
          }
        }
      }
      tags {
        id
        name
        color
      }
      originalEstimate {
        text
        value
        units
      }
      remainingEstimate {
        text
        value
        units
      }
      workDone {
        text
        value
        units
      }
      customFieldValues {
        key
        value
      }
    }
  }
`;

export const introspectFeatureFieldsQuery = `
  query IntrospectFeature {
    __type(name: "Feature") {
      name
      fields(includeDeprecated: true) {
        name
        args {
          name
          type {
            name
            kind
          }
        }
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
  }
`;

export const searchDocumentsQuery = `
  query SearchDocuments($query: String!, $searchableType: [String!]!) {
    searchDocuments(filters: {query: $query, searchableType: $searchableType}) {
      nodes {
        name
        url
        searchableId
        searchableType
      }
      currentPage
      totalCount
      totalPages
      isLastPage
    }
  }
`;
