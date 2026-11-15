const rolePath = (role) => ({
  ATTENDEE: '/',
  ORGANIZER: '/organizer',
  ADMIN: '/admin',
}[role] || '/')

export { rolePath }
