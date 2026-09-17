import 'dotenv/config';
import app from './app.js';

const port = Number(process.env.WEB_API_PORT || process.env.PORT || 4000);

const server = app.listen(port, () => {
  console.log(`SECSS Web API en puerto ${port}`);
});

export default server;
