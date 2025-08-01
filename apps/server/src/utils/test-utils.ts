// import { eq } from 'drizzle-orm'
// import { db } from '~/lib/db'
// import { auth } from '~/lib/auth'
// import {
//   organizations,
//   roles,
//   rolesToUsers,
//   users,
//   usersToOrganizations,
// } from '~/schemas'

// export const createUserWithRole = async (
//   name: string,
//   email: string,
//   roleKey?: 'admin',
// ) => {
//   const user = await db
//     .insert(users)
//     .values({
//       name,
//       email,
//     })
//     .returning()

//   const userId = user[0]!.id

//   const organization = await db.query.organizations.findFirst({
//     where: eq(organizations.isDefault, true),
//   })

//   const orgId = organization!.id

//   await db.insert(usersToOrganizations).values({
//     userId,
//     organizationId: orgId,
//   })

//   if (roleKey) {
//     const role = await db.query.roles.findFirst({
//       where: eq(roles.key, roleKey),
//     })

//     if (role) {
//       await db.insert(rolesToUsers).values({
//         userId,
//         roleId: role.id,
//         organizationId: orgId,
//       })
//     }
//   }

//   // Create a session using better-auth
//   // For testing purposes, we'll need to create a session manually
//   // Note: In a real test scenario, you might want to use better-auth's test utilities if available
//   const session = await auth.api.createSession({
//     userId: userId.toString(),
//   })

//   return { ...user[0]!, sessionToken: session.session.token }
// }
