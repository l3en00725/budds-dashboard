import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const httpLink = createHttpLink({
  uri: process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql',
});

const authLink = setContext((_, { headers }) => {
  // Get the authentication token from localStorage or session
  const token = typeof window !== 'undefined' ? localStorage.getItem('jobber_access_token') : null;

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'X-JOBBER-GRAPHQL-VERSION': '2023-03-15', // Use latest stable version
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    );
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);

    // Handle 401 errors by redirecting to auth
    if (networkError.statusCode === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jobber_access_token');
        window.location.href = '/api/auth/jobber';
      }
    }
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

// GraphQL Queries
export const GET_JOBS = `
  query GetJobs($first: Int, $after: String) {
    jobs(first: $first, after: $after) {
      nodes {
        id
        jobNumber
        title
        description
        status
        startAt
        endAt
        createdAt
        updatedAt
        client {
          id
          firstName
          lastName
          companyName
          emails {
            address
          }
        }
        lineItems {
          id
          name
          description
          quantity
          unitCost
          total
        }
        total
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const GET_CLIENTS = `
  query GetClients($first: Int, $after: String) {
    clients(first: $first, after: $after) {
      nodes {
        id
        firstName
        lastName
        companyName
        emails {
          address
        }
        phones {
          number
        }
        addresses {
          street1
          street2
          city
          province
          postalCode
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const GET_INVOICES = `
  query GetInvoices($first: Int, $after: String) {
    invoices(first: $first, after: $after) {
      nodes {
        id
        invoiceNumber
        status
        issueDate
        dueDate
        subtotal
        taxTotal
        total
        balance
        client {
          id
          firstName
          lastName
          companyName
        }
        job {
          id
          jobNumber
          title
        }
        lineItems {
          id
          name
          description
          quantity
          unitCost
          total
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;