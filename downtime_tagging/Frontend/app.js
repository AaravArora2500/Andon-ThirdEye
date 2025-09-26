const BASE_URL = 'http://localhost:3000';
let currentPlantId = null;

// Fetch and display tags
async function fetchTags() {
  const plantId = document.getElementById('plantIdInput').value;
  if (!plantId) return alert('Enter a plant ID');

  currentPlantId = plantId;

  try {
    const res = await fetch(`${BASE_URL}/downtime-tags/${plantId}`);
    const data = await res.json();

    if (!data.success) return alert(data.message);

    const tbody = document.querySelector('#tagsTable tbody');
    tbody.innerHTML = '';

    if (data.tags.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">No tags found</td></tr>';
      return;
    }

    const machineId = document.getElementById('machineIdInput').value;

    data.tags.forEach(tag => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${tag.id}</td>
        <td>${tag.category}</td>
        <td>${tag.description}</td>
        <td>${tag.department || ''}</td>
        <td>${tag.process_type || ''}</td>
        <td>${tag.sub_category || ''}</td>
        <td>${tag.target_duration || ''}</td>
        <td>
          <button onclick="assignTag('${machineId}', '${tag.id}')">Assign</button>
          <button onclick="removeTag('${machineId}')">Remove</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    alert('Error fetching tags');
  }
}

// Assign a tag to a machine
async function assignTag(machineId, tagId) {
  if (!machineId) return alert('Enter a Machine ID first');

  try {
    const res = await fetch(`${BASE_URL}/downtime/${machineId}/tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_code: tagId })
    });
    const data = await res.json();

    if (!data.success) return alert(data.message);

    alert(`Tag ${tagId} assigned to machine ${machineId}`);
  } catch (err) {
    console.error(err);
    alert('Error assigning tag');
  }
}

// Remove a tag from a machine
async function removeTag(machineId) {
  if (!machineId) return alert('Enter a Machine ID first');

  try {
    const res = await fetch(`${BASE_URL}/downtime/${machineId}/tag`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (!data.success) return alert(data.message);

    alert(`Tag removed from machine ${machineId}`);
  } catch (err) {
    console.error(err);
    alert('Error removing tag');
  }
}
