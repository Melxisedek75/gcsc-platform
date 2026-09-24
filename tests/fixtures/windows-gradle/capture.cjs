console.log(JSON.stringify({
  args: process.argv.slice(2),
  apiOrigin: process.env.EXPO_PUBLIC_API_BASE_URL,
  nodeEnv: process.env.NODE_ENV,
}));
process.exitCode = 7;
