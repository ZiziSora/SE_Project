# Final Exam Answers — Introduction to Software Engineering
**Project: Smart University Event Ecosystem (UniEvent)**

---

## 1. Your role, your tools, and your difficulties

I am a fullstack developer. I work on the Create and Manage Event module for organizers: create, update, cancel an event, and see the list of participants. I write both the API in Python and the interface in React. I use VS Code, Git and GitHub, Supabase for the database, and Claude to help me when I code.

My main difficulty is to turn my idea into code. I can imagine the feature, but the logic behind it is always harder than I think.

For example, the update function. At first I only wrote code to save the new information. Then I saw a problem: if the registration is already open, the new values must not overwrite the event at once, because students registered for the old event. So we added a new table to keep the edited values, and the admin can compare the old value and the new value. Only after the admin approves it, the system writes the change into the event and notifies the students.

---

## 2. Did your team have communication problems?

My team worked well together. We did not have any big conflict.

We only had two small problems at the beginning. First, the border between two modules was not clear. Nobody knew who had to build the QR check-in. We solved it in a meeting: we wrote down the tasks of each member, so it did not happen again.

Second, in one module the backend was made by another member, and I finished the screen before his API was ready. So we agreed on the API first: the URL, the field names, and the error format. Then I used fake data to test my screen, and I only replaced it when the real API was ready.

I think most communication problems do not come from talking too little. They come from not writing down what we agreed on.

---

## 3. Which languages and tools do you use to code?

We use three languages. Python for the backend, JavaScript (JSX) for the frontend, and SQL for the database.

For the backend we use FastAPI to build the REST API, Pydantic to check the input data, and JWT for login and permissions. For the frontend we use React with Vite, TailwindCSS for the design, Axios to call the API, and React Router to move between pages. The database is PostgreSQL on Supabase.

My tools are VS Code, Git and GitHub, Swagger UI to test the API, ESLint to check the frontend code, and pytest to test the backend.

---

## 4. Write 150 words about what you learned in this course

This course showed me that writing code is only a small part of building software. Before we write code, we must understand what the users need, turn their needs into use cases, and then design the database and the architecture. When we built UniEvent, I understood why we separate the interface, the business logic, and the data. Each part can change alone, and many people can work at the same time without breaking the work of the others. I also learned that requirements always change, so it is better to build the system step by step than to plan everything once. Other skills are just as important: using Git, writing documents, and designing test cases for normal cases and for limit cases. Finally, I learned that good software is not only software that runs. It must also be easy to maintain and safe for real users.

*(about 150 words)*

---

## 5. Which role in a software project do you like most? Why?

I like the role of tester the most, for three reasons.

First, the tester protects the users. A bug that we find early is cheap to fix. A bug that a student finds during a real event is not: he can lose his seat.

Second, this role fits the way I think. I always ask "what if?". What if the deadline is after the event? What if two students take the last seat at the same time?

Third, a tester must understand the whole system, not only his own code. When I wrote the test cases for my module, I also found requirements that were not clear. So testing finds bugs in the code and in the requirements too.

---

## 6. How did your team apply the knowledge and skills of this course?

**Requirements.** We studied how events are managed today with Google Forms, Excel, and Zalo groups. We found three types of users — students, organizers, and administrators — and we wrote user stories and a use case diagram.

**Design.** We drew the database diagram and chose a three-layer architecture: React, FastAPI, and PostgreSQL.

**Agile process.** We did not build everything at once. We worked in short sprints. In each sprint we allocated some features to each member, and we changed the number of tasks depending on the previous sprint. At the end of a sprint we had a meeting to discuss the problems and to see how far the project had gone. This helped us accept changes, because some rules appeared only after we tried the system.

**Teamwork and testing.** At the end of a sprint, each member tested his own part to see if there was any bug. When it worked well, we merged it into the common branch on Git.

---

## 7. What was the biggest difficulty of your team? If you were the leader, how would you solve it?

In our team, each member codes the frontend and the backend of his own feature. Each one works well alone, but the problem comes when we merge the code. Every member organizes his files in a different way, so we have many conflicts on Git and we lose a lot of time to fix them. The interface is also different: the format, the font, and the colours are not the same from one page to another, so the website does not look like one product.

If I were the leader, I would write a rules file before the team starts to code. It would describe the structure of the folders, the names of the files, and the common style — the font, the colours, and the shared components. I would also write an AGENTS.md file in the repository. So when a member asks AI for help, the AI reads this file, understands the context of our project, and gives code in the same format as the rest of the team.

---

## 8. Do you use AI when you code? How do you use it, and what are the difficulties?

Yes, I use AI when I code, but I use it as a helper, not as a replacement.

I use it in four ways: to explain an error message that I do not understand, to ask for a better way to organize my code, to check the cases that I forgot — for example, what happens if the organizer edits an event that already started — and to write documents and test cases faster.

I had three difficulties with AI. First, AI does not know our business rules and our database, so it often gives a general answer, or it uses a field name that we do not have. I must give it the context of the project first. Second, each member receives a different code style from AI, so at the beginning our project was not consistent. Third, it is easy to copy code that I do not understand: it works today, but I cannot fix it when there is a bug. So my rule is simple: I never commit code that I cannot explain.

---

## 9. How did your team apply AI to the project?

We used AI in two ways.

In our work, each member used AI to learn a new library, to find bugs faster, and to write the documents faster.

In the product, UniEvent also uses an existing AI service to recommend events. It suggests events to a student from his interests and from the events he joined before. But we do not have much data yet, so the suggestions are not very good for a new student.

We had three difficulties with AI. First, AI does not know our business rules and our database, so it often gives a general answer, or it uses a field name that we do not have. We must give it the context of the project first. Second, each member receives a different code style from AI, so at the beginning our project was not consistent. Third, it is easy to copy code that we do not understand: it works today, but we cannot fix it when there is a bug. So our rule is simple: we never merge code that we cannot explain.

---

## Extra: short answers if the teacher asks more

- **"What would you do differently?"** — I would agree on the API and on the event statuses earlier, and write the test cases while I code, not after.
- **"You used AI. What part is your own work?"** — The design, the rules, and the testing are mine. AI helps me write faster, but I never commit code that I cannot explain.
- **"Which function was the hardest?"** — The waiting list, because when a student cancels, the first student on the list must be promoted automatically.
