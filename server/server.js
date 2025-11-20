import express from "express";
import cors from "cors";
import jobsRouter from "./routes/jobs.js";
import applicationsRouter from "./routes/applications.js";
import authRouter from "./routes/auth.js";
// import tripRouter from "./routes/trips.js";
// import activityRouter from "./routes/activities.js";
// import destinationRouter from "./routes/destinations.js";
// import tripsDestinationsRouter from "./routes/tripsDestinations.js";
// import usersRouter from "./routes/users.js";
// import tripsUsersRouter from "./routes/tripsUsers.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res
    .status(200)
    .send(
      '<h1 style="text-align: center; margin-top: 50px;">⛓ Job Ledger API</h1>'
    );
});

app.use("/jobs", jobsRouter);
app.use("/api/jobs", jobsRouter);
app.use("/auth", authRouter);
app.use("/api/auth", authRouter);
app.use("/applications", applicationsRouter);
app.use("/api/applications", applicationsRouter);
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
