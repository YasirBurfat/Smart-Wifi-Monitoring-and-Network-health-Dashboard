import { COMPLAINT_STATUSES, COMPLAINT_TYPES } from '../api/complaints.js'
import { fieldClass } from './formStyles.js'

const NETWORK_STATUSES = ['Green', 'Yellow', 'Red', 'Excellent', 'Good', 'Fair', 'Poor', 'Critical']

function SelectField({ label, value, onChange, testId, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-slate-400">{label}</span>
      <select className={fieldClass} value={value} data-testid={testId} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  )
}

export default function FilterBar({ filters, locations, onChange }) {
  const buildings = [...new Set((locations || []).map((location) => location.building).filter(Boolean))]

  function set(key, value) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="filter-bar">
      <SelectField label="Location" value={filters.locationId} testId="filter-location" onChange={(value) => set('locationId', value)}>
        <option value="">All locations</option>
        {(locations || []).map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </SelectField>
      <SelectField label="Building" value={filters.building} testId="filter-building" onChange={(value) => set('building', value)}>
        <option value="">All buildings</option>
        {buildings.map((building) => (
          <option key={building} value={building}>
            {building}
          </option>
        ))}
      </SelectField>
      <label className="block text-sm">
        <span className="mb-1.5 block text-slate-400">Date</span>
        <input
          type="date"
          className={fieldClass}
          value={filters.date}
          data-testid="filter-date"
          onChange={(event) => set('date', event.target.value)}
        />
      </label>
      <SelectField
        label="Network status"
        value={filters.networkStatus}
        testId="filter-network"
        onChange={(value) => set('networkStatus', value)}
      >
        <option value="">All statuses</option>
        {NETWORK_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Complaint type"
        value={filters.complaintType}
        testId="filter-complaint-type"
        onChange={(value) => set('complaintType', value)}
      >
        <option value="">All types</option>
        {COMPLAINT_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Complaint status"
        value={filters.complaintStatus}
        testId="filter-complaint-status"
        onChange={(value) => set('complaintStatus', value)}
      >
        <option value="">All complaint statuses</option>
        {COMPLAINT_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </SelectField>
    </div>
  )
}
