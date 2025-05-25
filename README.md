For this weather app, I originally made it a frontend only application that made calls to OpenWeatherAPI to get the current weather and a 5 day forecast. Afterwards, I started working on making the backend and moved the API calls to the backend.
The backend API calls to OpenWeatherAPI also save the data to a mongoDB database (locally hosted). I then added the buttons for the current weather and the 5 day forecast back to the frontend to allow people to search for weather without saving it. 
I also implemented the CRUD functionality, allowing users to view, update, and delete the data saved in the database while also being able to export it to a CSV file.

To run this, you need to run "node index.js" while in the backend directory to run the backend (while also having mongoDB installed to have the database). For running the frontend, I always used "npm run dev" to allow changes I made to the frontend to be reflected without having to rerun the frontend.
