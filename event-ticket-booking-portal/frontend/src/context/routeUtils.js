const rolePath = (role) => ({
  ATTENDEE: '/attendee',
  ORGANIZER: '/organizer',
  ADMIN: '/admin',
}[role] || '/')

export { rolePath }
