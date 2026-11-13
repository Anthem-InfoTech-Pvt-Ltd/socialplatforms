// app/api/auth/instagram/route.ts
// Instagram connect via the NEW Meta app (Unified login = Facebook Login for
// Business with a config_id). No scope param: permissions come from the config.
export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/instagram/callback`,
    config_id: process.env.INSTAGRAM_LOGIN_CONFIG_ID!,
    response_type: 'code',
    // Present in the Login URL that Meta's dashboard generates for Unified login.
    // If the dashboard's Login URL doesn't have it, delete this line.
    override_default_response_type: 'true',
  })

  return Response.redirect(
    `https://www.facebook.com/v26.0/dialog/oauth?${params}`
  )
}



// // app/api/auth/instagram/route.ts
// export async function GET() {
//   const params = new URLSearchParams({
//     client_id: process.env.FACEBOOK_APP_ID!,
//     redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/instagram/callback`,
//     config_id: process.env.FACEBOOK_LOGIN_CONFIG_ID!,
//     response_type: 'code',
//   })

//   return Response.redirect(
//     `https://www.facebook.com/v18.0/dialog/oauth?${params}`
//   )
// }