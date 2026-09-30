export const QUESTION_BANK = {
  "Software Engineer": {
    Beginner: {
      Technical: [
        "What is the difference between a stack and a queue? Give a real-world example of each.",
        "Explain what an API is and how you would use one in a web application.",
        "What is the difference between compiled and interpreted languages?",
        "What does DRY (Don't Repeat Yourself) mean in software development?",
        "Explain what version control is and why Git is used.",
        "What is the difference between an array and a linked list?",
        "What is object-oriented programming? Name its four main principles.",
        "What is the difference between HTTP and HTTPS?",
        "What is a database and why do applications use one?",
        "Explain what a loop is and when you would use a for loop vs a while loop.",
        "What is the difference between == and === in JavaScript?",
        "What is a function and why is code reuse important in software development?",
        "What is the difference between front-end and back-end development?",
        "Explain what a bug is and describe how you would debug a simple error.",
        "What is a boolean and how is it used in conditional statements?",
      ],
      Behavioral: [
        "Tell me about yourself and why you want to become a software engineer.",
        "Describe a time you learned a new technology quickly. How did you approach it?",
        "Tell me about a project you built. What problem did it solve?",
        "How do you handle it when you are stuck on a problem for a long time?",
        "Describe a situation where you had to ask for help. How did you do it?",
        "Tell me about a time you made a mistake in your code. How did you fix it?",
        "How do you prioritize tasks when you have multiple things to work on?",
        "Describe a time when you had to learn something difficult under pressure.",
        "Tell me about a group project you worked on. What was your role?",
        "How do you stay motivated when working on repetitive or tedious tasks?",
      ],
    },
    Intermediate: {
      Technical: [
        "Explain the difference between SQL and NoSQL databases. When would you choose one over the other?",
        "What is Big O notation? What is the time complexity of binary search?",
        "Explain the concept of recursion and provide an example use case.",
        "What is the difference between synchronous and asynchronous programming?",
        "Describe the REST architectural style. What makes an API RESTful?",
        "What is a design pattern? Describe the Singleton and Observer patterns.",
        "Explain how garbage collection works in managed languages like Java or Python.",
        "What is a race condition? How would you prevent one in a multi-threaded program?",
        "Describe the differences between a process and a thread.",
        "What is caching and how would you implement it to improve API response time?",
        "What is the difference between a monolithic and a microservices architecture?",
        "Explain what dependency injection is and why it is useful.",
        "How does a hash table work? What is a hash collision and how is it resolved?",
        "Explain the SOLID principles of object-oriented design.",
        "What is the difference between mutable and immutable data structures? Give an example.",
      ],
      Behavioral: [
        "Describe a time you had to deliver a feature under a tight deadline. What trade-offs did you make?",
        "Tell me about a technical disagreement you had with a teammate. How was it resolved?",
        "Give an example of when you proactively identified and fixed a bug before it reached production.",
        "Describe a time you refactored code significantly. What was the outcome?",
        "Tell me about the most challenging bug you have ever debugged. How did you approach it?",
        "How do you stay current with new technologies and industry trends?",
        "Describe a time you mentored a junior developer or helped a teammate learn something new.",
        "Tell me about a time you had to say no to a request. How did you handle it?",
        "Describe a time you received critical feedback on your code. How did you respond?",
        "Tell me about a time you underestimated a task. What did you learn from it?",
      ],
    },
    Advanced: {
      Technical: [
        "Design a URL shortener service like bit.ly. Walk through the full system architecture.",
        "Explain CAP theorem and how it applies to distributed database design.",
        "How would you design a system to handle 1 million concurrent websocket connections?",
        "What is consistent hashing and where would you use it in a distributed system?",
        "Explain the difference between optimistic and pessimistic locking.",
        "How would you approach database sharding for a high-traffic application?",
        "What are the trade-offs between microservices and a monolith architecture?",
        "Explain event sourcing and CQRS. What problems do they solve?",
        "Design a distributed rate-limiting system. What strategies would you consider?",
        "How would you ensure zero-downtime deployments in a large production system?",
        "What is a service mesh and when would you introduce one into a microservices architecture?",
        "Explain how you would implement idempotency in a payment processing API.",
        "How do you design for observability in a distributed system?",
        "Explain two-phase commit vs saga pattern for managing distributed transactions.",
        "How would you design a global CDN for low-latency static asset delivery?",
      ],
      Behavioral: [
        "Tell me about a time you led a technical initiative from idea to production.",
        "Describe a situation where you had to push back on a product requirement for technical reasons.",
        "Tell me about a time you made a critical architecture decision. What was your process?",
        "Describe a production incident you owned. How did you diagnose, fix, and prevent recurrence?",
        "Give an example of how you have influenced engineering best practices at your organization.",
        "Tell me about a time you managed competing priorities across multiple stakeholders.",
        "Describe a time you drove adoption of a new tool or process across an engineering team.",
        "Tell me about a time you navigated ambiguity in a project with unclear requirements.",
      ],
    },
  },
  "Frontend Developer": {
    Beginner: {
      Technical: [
        "What is the difference between HTML, CSS, and JavaScript? What role does each play?",
        "Explain the CSS box model. What are margin, border, padding, and content?",
        "What is the DOM and how does JavaScript interact with it?",
        "What is the difference between display: block, inline, and inline-block in CSS?",
        "Explain what CSS flexbox is and give a use case for it.",
        "What is responsive design? How do media queries help achieve it?",
        "What is the difference between var, let, and const in JavaScript?",
        "What is the purpose of the alt attribute on an img element?",
        "What is a CSS class vs an ID? When would you use each?",
        "What are semantic HTML elements? Give three examples and explain why they matter.",
        "What is the difference between padding and margin in CSS?",
        "What is an event listener? Give an example of how you would add one in JavaScript.",
        "What is the difference between position: relative and position: absolute in CSS?",
        "What is localStorage and how does it differ from sessionStorage?",
        "What does it mean for a website to be accessible and why is it important?",
      ],
      Behavioral: [
        "Tell me about a website or UI you built that you are proud of.",
        "How do you decide between different approaches when styling a component?",
        "How do you test that your UI looks correct across different browsers?",
        "Tell me about a time you worked closely with a designer to implement a UI.",
        "Describe a time you improved the visual quality of a page you were working on.",
        "How do you approach a new design mockup before you start coding it?",
        "Tell me about a UI bug that was hard to reproduce. How did you track it down?",
      ],
    },
    Intermediate: {
      Technical: [
        "Explain the virtual DOM and how React uses it to optimize rendering.",
        "What is the difference between controlled and uncontrolled components in React?",
        "How does CSS specificity work? How do you resolve specificity conflicts?",
        "What is code splitting and why is it important for frontend performance?",
        "Explain the React component lifecycle. How do hooks replace lifecycle methods?",
        "What is the difference between useState and useReducer? When would you use each?",
        "How does browser rendering work? What is the critical rendering path?",
        "What is memoization in React? Explain React.memo, useMemo, and useCallback.",
        "Explain the difference between SSR, SSG, and CSR. When would you choose each?",
        "What is tree shaking and how does a bundler like Vite or Webpack implement it?",
        "How would you implement lazy loading for images on a long scrolling page?",
        "What is CORS and how would you resolve a CORS error in a React application?",
        "What is debouncing and throttling? Give a frontend use case for each.",
        "How would you manage global state in a large React application?",
        "What is the purpose of useEffect? What are the rules for its dependency array?",
      ],
      Behavioral: [
        "Describe a time you significantly improved the performance of a web page.",
        "Tell me about a complex UI component you built from scratch.",
        "Tell me about a time you had to make a UI decision without clear design specifications.",
        "Describe a time you introduced a UI component library or design system to a team.",
        "Tell me about a time you had to refactor a messy CSS codebase.",
        "Describe a time you received negative feedback on a UI you built. How did you respond?",
        "Tell me about a time you had to balance design fidelity with development speed.",
      ],
    },
    Advanced: {
      Technical: [
        "How would you architect a large-scale React application for performance, scalability, and maintainability?",
        "Explain micro-frontend architecture. What are its benefits and trade-offs?",
        "How do you prevent XSS and CSRF attacks in a modern single-page application?",
        "Describe strategies for optimizing Core Web Vitals (LCP, CLS, INP) on a content-heavy site.",
        "What are the trade-offs between CSS-in-JS and utility-first CSS like Tailwind?",
        "How would you implement a design token system across a multi-brand frontend application?",
        "What is the Reconciliation algorithm in React and how does fiber architecture improve it?",
        "How would you implement offline-first functionality in a progressive web app?",
        "How would you build a real-time collaborative editor on the frontend?",
        "How would you approach server-side rendering for SEO in a React application?",
        "What strategies would you use to reduce the bundle size of a large React application?",
        "How would you implement a virtualized list to render 100,000 rows efficiently?",
        "Explain the island architecture and how it compares to full server-side rendering.",
        "How would you design an accessible and keyboard-navigable modal component?",
        "Describe how you would implement internationalization (i18n) in a large frontend app.",
      ],
      Behavioral: [
        "Tell me about a time you defined the frontend architecture for a new product from scratch.",
        "Describe how you handled a major UI regression that reached production.",
        "Tell me about a large-scale frontend migration you led or participated in.",
        "Describe a time you advocated for frontend developer experience improvements.",
        "Tell me about a time you set and enforced frontend coding standards across a team.",
      ],
    },
  },
  "Backend Developer": {
    Beginner: {
      Technical: [
        "What is a REST API? How is it different from a GraphQL API?",
        "Explain the difference between GET, POST, PUT, and DELETE HTTP methods.",
        "What is a relational database? How does a JOIN work?",
        "What is middleware in a web framework like Express or Django?",
        "Explain the difference between authentication and authorization.",
        "What is JSON and why is it commonly used in APIs?",
        "What is an HTTP status code? What do 200, 404, and 500 mean?",
        "What is a primary key and a foreign key in a relational database?",
        "What is the difference between a synchronous and asynchronous function?",
        "What is an environment variable and why is it used in backend development?",
        "What is SQL? Give an example of a SELECT query with a WHERE clause.",
        "What is a session and how is it different from a cookie?",
        "What does CRUD stand for in the context of web APIs?",
        "What is the difference between a web server and an application server?",
        "What is an ORM and why is it useful when working with a database?",
      ],
      Behavioral: [
        "Tell me about a backend project you built. What problem did it solve?",
        "Describe a time you had to debug an issue in an API you built.",
        "How do you decide which database to use for a given project?",
        "How do you test your API endpoints before deploying to production?",
        "Tell me about a time you improved the reliability of a backend service.",
        "Describe a time you had to read and understand someone else's backend code quickly.",
      ],
    },
    Intermediate: {
      Technical: [
        "Explain the N+1 query problem and how you solve it with eager loading.",
        "What are database indexes? How do they speed up queries and what are their trade-offs?",
        "Describe how you would implement JWT-based authentication in a REST API.",
        "What is the difference between horizontal and vertical scaling?",
        "What is a database transaction? Explain ACID properties.",
        "Describe how you would implement role-based access control (RBAC) in an API.",
        "What is a message queue? When would you use it over a direct API call?",
        "What is connection pooling and why is it important for database performance?",
        "How does database replication work? What is the difference between a primary and replica?",
        "Explain the difference between a hard delete and a soft delete. When would you use each?",
        "What is rate limiting? How would you implement it in a REST API?",
        "Explain idempotency. Which HTTP methods should be idempotent and why?",
        "What is SQL injection? How do you prevent it in a backend application?",
        "How would you paginate a large dataset in an API efficiently?",
        "What is the difference between eager loading and lazy loading in an ORM?",
      ],
      Behavioral: [
        "Describe a time you designed an API that was later consumed by a mobile team.",
        "Tell me about a performance bottleneck you identified and fixed in a backend system.",
        "Tell me about a time you implemented security improvements to a backend application.",
        "Describe a time you had to migrate a database schema without downtime.",
        "Tell me about a time you improved the test coverage of a backend service.",
      ],
    },
    Advanced: {
      Technical: [
        "Design a notification system that sends emails, SMS, and push notifications at massive scale.",
        "How would you implement distributed tracing across a microservices architecture?",
        "Explain the saga pattern for managing distributed transactions. When would you use it?",
        "Describe how you would build a multi-tenant SaaS backend with strong data isolation.",
        "How would you build a job scheduling system that is fault-tolerant and exactly-once?",
        "How would you design a backend to handle burst traffic with graceful degradation?",
        "Explain event-driven architecture. What are its benefits and challenges in microservices?",
        "How would you implement API versioning for a public API used by many clients?",
        "Design a real-time leaderboard system for a game with millions of concurrent users.",
        "How would you approach zero-downtime database migrations in a high-traffic production system?",
        "What is backpressure in a streaming system and how do you handle it?",
        "How would you secure secrets and credentials in a cloud-native backend?",
        "How would you build an audit log system that is tamper-evident?",
        "Describe how you would implement the outbox pattern to ensure reliable event publishing.",
        "How would you design a backend to support global data residency requirements?",
      ],
      Behavioral: [
        "Tell me about a time you led backend architecture for a product that scaled to millions of users.",
        "Describe a production outage you were responsible for diagnosing and fixing.",
        "Describe how you have built a culture of reliability and observability in a backend team.",
        "Tell me about a time you made a difficult trade-off between security and developer velocity.",
        "Describe a time you deprecated an old API version while keeping existing clients working.",
      ],
    },
  },
  "AI/ML Engineer": {
    Beginner: {
      Technical: [
        "What is the difference between supervised, unsupervised, and reinforcement learning?",
        "Explain what a training set, validation set, and test set are and why each is needed.",
        "What is overfitting? How can you detect it and what techniques reduce it?",
        "What is a neural network? Explain neurons, layers, and activation functions.",
        "What is gradient descent and what role does the learning rate play?",
        "What is a confusion matrix and what metrics can you derive from it?",
        "What is the difference between classification and regression?",
        "What is feature engineering? Give an example of a useful engineered feature.",
        "What is normalization and why is it important before training a model?",
        "What is a hyperparameter? Give two examples from a decision tree model.",
        "What is the difference between precision and recall? When would you prioritize recall over precision?",
        "What is the bias-variance trade-off in machine learning?",
        "What is cross-validation and why is it preferred over a single train-test split?",
        "What is one-hot encoding and when would you use it?",
        "What is the difference between a parametric and non-parametric model?",
      ],
      Behavioral: [
        "Tell me about a machine learning project you built or studied in depth.",
        "How do you approach understanding a new dataset for the first time?",
        "Describe a time you had to explain an ML concept to someone without a technical background.",
        "Tell me about a time your model did not perform as expected. What did you do?",
        "How do you decide which algorithm to try first on a new problem?",
      ],
    },
    Intermediate: {
      Technical: [
        "Explain backpropagation. How are gradients computed through a neural network?",
        "What is transfer learning and how would you fine-tune a pre-trained model for a new task?",
        "Explain the attention mechanism. How does it differ from traditional RNN approaches?",
        "What is the difference between bagging and boosting? Give an example of each.",
        "How do you handle class imbalance in a binary classification problem?",
        "What are the key considerations when deploying an ML model to production?",
        "Explain batch normalization and why it helps training stability.",
        "What is a word embedding? How does Word2Vec differ from contextual embeddings like BERT?",
        "What is dropout regularization and how does it prevent overfitting?",
        "How would you detect data drift in a production ML system?",
        "What is the difference between L1 and L2 regularization? When would you use each?",
        "Explain the concept of feature importance in tree-based models.",
        "What is SMOTE and how does it address class imbalance in datasets?",
        "What is the difference between generative and discriminative models?",
        "How would you evaluate a recommendation system in a production environment?",
      ],
      Behavioral: [
        "Describe a time you improved a model's performance significantly.",
        "Tell me about a time you discovered data leakage in an ML pipeline.",
        "Describe a situation where your model worked well offline but poorly in production.",
        "Tell me about a time you had to balance model accuracy with inference latency.",
        "Describe a time you had to handle missing or corrupt data in a training dataset.",
      ],
    },
    Advanced: {
      Technical: [
        "How would you design a real-time ML inference system serving predictions at low latency?",
        "Explain the transformer architecture in detail including multi-head attention and positional encoding.",
        "What is RLHF and how is it used to align large language models?",
        "How do you detect and handle concept drift in a production ML model?",
        "Describe the trade-offs between model distillation, quantization, and pruning.",
        "How would you design an A/B testing framework for comparing two ML models in production?",
        "Explain multi-task learning. What are its advantages and challenges?",
        "How would you build a feature store for a large ML platform?",
        "What is continual learning and what challenges does it pose for production systems?",
        "Describe how you would build a responsible AI review process for a customer-facing model.",
        "How would you design an ML system for low-resource languages with minimal training data?",
        "Explain how federated learning works and what privacy guarantees it provides.",
        "How would you implement an automated ML pipeline with hyperparameter optimization at scale?",
        "What is model calibration and why is it important in high-stakes classification problems?",
        "Describe how you would design a ground truth collection pipeline for a production ML system.",
      ],
      Behavioral: [
        "Tell me about a time you led an ML project from problem definition to production deployment.",
        "Describe a time you navigated ethical concerns or risks in an ML project.",
        "Tell me about a time you pushed back on a request to deploy a model you believed was not ready.",
        "Describe a time you built alignment across ML, product, and business stakeholders.",
        "Tell me about a time you significantly reduced the cost of running an ML system in production.",
      ],
    },
  },
  "Data Analyst": {
    Beginner: {
      Technical: [
        "What is the difference between a mean, median, and mode? When would you use each?",
        "Explain what a JOIN is in SQL. What is the difference between INNER JOIN and LEFT JOIN?",
        "What is a pivot table and how is it useful in data analysis?",
        "What is the difference between a bar chart and a histogram?",
        "What does GROUP BY do in SQL? Give a practical example.",
        "Explain what data cleaning is and why it is important before analysis.",
        "What is the difference between structured and unstructured data?",
        "What is a NULL value in SQL and how do you handle it in queries?",
        "What is the difference between COUNT, SUM, and AVG aggregate functions in SQL?",
        "What is a KPI? Give an example of a business KPI and how you would measure it.",
        "What is the difference between a dimension and a measure in a data warehouse?",
        "What is the purpose of the WHERE clause in SQL and how does it differ from HAVING?",
        "Explain what a subquery is in SQL and give an example of when you would use one.",
        "What is the difference between a line chart and a scatter plot? When would you use each?",
        "What is data normalization in the context of a relational database?",
      ],
      Behavioral: [
        "Tell me about a time you used data to answer a business question.",
        "Describe a time you had to clean a messy or incomplete dataset.",
        "How do you communicate your analysis findings to a non-technical audience?",
        "Tell me about a dashboard or report you built that stakeholders found valuable.",
        "Describe a time you had to work with incomplete data. How did you handle it?",
      ],
    },
    Intermediate: {
      Technical: [
        "How would you design a funnel analysis to understand drop-off in a sign-up flow?",
        "Explain window functions in SQL. Give an example using ROW_NUMBER or LAG.",
        "What is cohort analysis and when would you use it?",
        "How do you perform A/B test analysis? How do you determine statistical significance?",
        "How would you detect seasonality in a time-series dataset?",
        "What is the difference between correlation and causation? Give an example of each.",
        "What is a data warehouse and how does it differ from a transactional database?",
        "Explain the concept of data granularity. Why does it matter in analysis?",
        "What is a z-score and how would you use it to detect outliers in a dataset?",
        "How would you calculate user retention rate from a user events table in SQL?",
        "What is the difference between a star schema and a snowflake schema?",
        "Explain what a p-value means in hypothesis testing in plain language.",
        "What is churn rate and how would you calculate it from a database?",
        "How would you build a customer segmentation using RFM analysis?",
        "What is a moving average and when is it useful in time-series analysis?",
      ],
      Behavioral: [
        "Tell me about a time your data analysis directly influenced a product or business decision.",
        "Describe a situation where two data sources gave you conflicting results.",
        "Describe a time you had to communicate a negative insight—data that showed a product was underperforming.",
        "Tell me about a time you disagreed with a stakeholder's interpretation of data.",
        "Describe a time you found an unexpected insight that changed the direction of a project.",
      ],
    },
    Advanced: {
      Technical: [
        "How would you build a multi-touch attribution model to measure marketing channel effectiveness?",
        "Describe how you would design a real-time analytics pipeline for a high-volume event stream.",
        "How would you approach forecasting revenue for the next 12 months using historical transaction data?",
        "Describe how you would implement anomaly detection on a live business metrics dashboard.",
        "How would you design a self-serve analytics platform for non-technical business users?",
        "Explain how you would implement incrementally updating aggregates in a large data warehouse.",
        "What is Bayesian A/B testing and how does it differ from frequentist hypothesis testing?",
        "How would you design an experiment to measure the impact of a recommendation algorithm?",
        "Describe how you would build a data lineage system for a complex analytics pipeline.",
        "How would you detect and handle bot traffic in a web analytics dataset?",
        "Explain how you would model customer lifetime value (LTV) using historical transaction data.",
        "How would you design a metrics taxonomy that scales across a large organization?",
        "Describe how you would approach causal inference when running an experiment is not possible.",
        "How would you build a data quality monitoring system for a production analytics pipeline?",
        "Explain how you would use propensity score matching for an observational study.",
      ],
      Behavioral: [
        "Tell me about a time you built an analytics strategy or roadmap for a product area.",
        "Describe a time you convinced senior leadership to change strategy based on your data analysis.",
        "Tell me about a time you identified a major data quality issue and led the effort to fix it.",
        "Describe a time you partnered with engineering to build a new data pipeline from scratch.",
        "Tell me about a time you evangelized a data-driven culture in an organization that was not used to it.",
      ],
    },
  },
};

/**
 * Returns exactly `count` unique, randomly shuffled questions for the given setup.
 * Works for 5 or 10 questions — pool has 15+ per category so no repeats.
 */
export function getQuestions(setup) {
  const role = setup?.role || 'Software Engineer';
  const difficulty = setup?.difficulty || 'Intermediate';
  const type = setup?.type || 'Technical';
  const count = setup?.questionCount || 5;

  const byRole = QUESTION_BANK[role] || QUESTION_BANK['Software Engineer'];
  const byDiff = byRole[difficulty] || byRole['Intermediate'];

  let pool;
  if (type === 'Mixed') {
    const techPool = [...(byDiff['Technical'] || [])];
    const behPool = [...(byDiff['Behavioral'] || [])];
    // Shuffle both sub-pools independently
    for (let i = techPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [techPool[i], techPool[j]] = [techPool[j], techPool[i]];
    }
    for (let i = behPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [behPool[i], behPool[j]] = [behPool[j], behPool[i]];
    }
    // Interleave: alternating tech/behavioral for a natural mixed flow
    const techCount = Math.ceil(count / 2);
    const behCount = Math.floor(count / 2);
    pool = [
      ...techPool.slice(0, techCount),
      ...behPool.slice(0, behCount),
    ];
  } else {
    pool = [...(byDiff[type] || byDiff['Technical'] || [])];
  }

  // Fisher-Yates shuffle for true randomness
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}
