# Advisor Profile Page Implementation

## Overview

This implementation provides a complete advisor profile page similar to Houlihan Lokey's profile, including data fetching, type definitions, and UI components.

## File Structure

```
src/
├── types/
│   └── advisor.ts                    # TypeScript interfaces for API responses
├── lib/
│   └── advisorService.ts             # API service layer
├── hooks/
│   └── useAdvisorProfile.ts          # Custom hook for data management
├── utils/
│   └── advisorHelpers.ts             # Utility functions for data processing
├── components/
│   ├── ui/
│   │   ├── LoadingSpinner.tsx       # Loading component
│   │   └── ErrorMessage.tsx         # Error display component
│   └── advisor/
│       ├── AdvisorOverview.tsx       # Advisor overview component
│       └── CorporateEventsTable.tsx  # Corporate events table
└── app/
    ├── advisor/
    │   └── [param]/
    │       └── page.tsx             # Main advisor profile page
    └── test-advisor/
        └── page.tsx                 # Test page for development
```

## API Endpoints

### 1. Get Advisor Profile

- **URL**: `https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn/get_the_advisor_new_company`
- **Method**: GET
- **Auth**: Required (Bearer token)
- **Query Parameters**: `{ "new_comp_id": number }`

### 2. Get Corporate Events

- **URL**: `https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn/get_advosirs_corporate_ivents_new`
- **Method**: GET
- **Auth**: Required (Bearer token)
- **Query Parameters**: `{ "new_comp_id": number }`

## Key Features

### 1. Type Safety

- Comprehensive TypeScript interfaces for all API responses
- Proper type checking for advisor data, corporate events, and related entities

### 2. Data Management

- Custom hook (`useAdvisorProfile`) for centralized data fetching
- Parallel API calls for better performance
- Error handling and loading states

### 3. UI Components

- **AdvisorOverview**: Displays advisor's basic information in a two-column layout
- **CorporateEventsTable**: Shows corporate events in a responsive table
- **LoadingSpinner**: Loading state component
- **ErrorMessage**: Error display component

### 4. Utility Functions

- `formatCurrency`: Formats currency values with proper symbols
- `formatDate`: Formats dates consistently
- `formatSectorsList`: Formats sector lists
- `getCounterpartyRole`: Extracts counterparty role from events
- `getOtherAdvisorsText`: Formats other advisors list

## Usage

### Main Advisor Page

Navigate to `/advisor/[id]` where `[id]` is the advisor's ID.

Example: `/advisor/6927` for Houlihan Lokey

### Test Page

Navigate to `/test-advisor` for testing different advisor IDs and API functionality.

## Authentication

The implementation uses the existing `authService` from `src/lib/auth.ts` for authentication. Make sure you're logged in to access the advisor pages.

## Error Handling

- 401 errors automatically redirect to login
- Network errors are displayed to the user
- Invalid advisor IDs show "Advisor not found" message

## Responsive Design

- Mobile-friendly table with horizontal scroll
- Responsive grid layout for overview section
- Proper spacing and typography

## Future Enhancements

1. Add pagination for corporate events
2. Implement search and filtering
3. Add more detailed event information
4. Implement caching for better performance
5. Add export functionality for data
6. Implement real-time updates

## Testing

Use the test page at `/test-advisor` to:

- Test different advisor IDs
- Verify API responses
- Check error handling
- Test loading states

## Example Usage

```typescript
import { useAdvisorProfile } from "../hooks/useAdvisorProfile";

function MyComponent() {
  const { advisorData, corporateEvents, loading, error } = useAdvisorProfile({
    advisorId: 6927,
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div>
      <AdvisorOverview advisorData={advisorData} />
      <CorporateEventsTable
        events={corporateEvents?.New_Events_Wits_Advisors || []}
      />
    </div>
  );
}
```
