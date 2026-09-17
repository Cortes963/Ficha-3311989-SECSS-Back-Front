import 'dotenv/config';
import app from './app.js';

const port = Number(process.env.PORT || 4000);

const server = app.listen(port, () => {
  console.log(`SECSS API en puerto ${port}`);
});

export default server;
