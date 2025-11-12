import express from "express";
// import cors from "cors";
// import tripRouter from "./routes/trips.js";
// import activityRouter from "./routes/activities.js";
// import destinationRouter from "./routes/destinations.js";
// import tripsDestinationsRouter from "./routes/tripsDestinations.js";
// import usersRouter from "./routes/users.js";
// import tripsUsersRouter from "./routes/tripsUsers.js";

// create express app
const app = express();
app.use(express.json());
// app.use(cors());

app.get("/", (req, res) => {
  res
    .status(200)
    .send(
      '<h1 style="text-align: center; margin-top: 50px;">⛓ Job Ledger API</h1>'
    );
});

// app.use("/trips", tripRouter);
// app.use("/activities", activityRouter);
// app.use("/destinations", destinationRouter);
// app.use("/trips-destinations", tripsDestinationsRouter);
// app.use("/users", usersRouter);
// app.use("/trips-users", tripsUsersRouter);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
