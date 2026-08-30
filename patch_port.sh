#!/bin/bash
sed -i 's/const PORT = process.env.PORT;/const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;/' server.ts
