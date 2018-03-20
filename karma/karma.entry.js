const context = require
    .context('../test/', true, /\.spec\.ts$/);

context
    .keys()
    .forEach(context);
