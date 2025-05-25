const BASE_URL = 'http://localhost:5000/api/queries';


export async function createWeatherQuery(location, startDate, endDate) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ location, startDate, endDate })
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || 'Failed to create weather query');
  }

  return res.json(); // { message, weatherRecords }
}

export async function getAllQueries() {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error('Failed to fetch queries');
  return res.json(); // [ { id, location, start_date, end_date, ... } ]
}

export async function updateQuery(id, location, startDate, endDate) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ location, startDate, endDate })
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || 'Failed to update query');
  }

  return res.json();
}

export async function deleteQuery(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || 'Failed to delete query');
  }

  return res.json();
}

export async function exportQueryCSV(queryId) {
  const response = await fetch(`${BASE_URL}/${queryId}/export`, {
    method: 'GET',
    headers: {
      'Accept': 'text/csv',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to export CSV');
  }

  // Return the CSV as blob for download
  return await response.blob();
}