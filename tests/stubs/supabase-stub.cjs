// Test stub for '@/lib/supabase': state controlled via globalThis.__sb
exports.createServerClient = async () => ({
  auth: { getUser: async () => ({ data: { user: globalThis.__sb.user } }) },
  rpc: async (fn, args) => ({ data: fn === 'fm_is_admin' ? globalThis.__sb.admins.includes(args.uid) : null }),
})
