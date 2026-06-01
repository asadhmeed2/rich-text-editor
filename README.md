# RichTextEditor

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.21.


## the Issue trying to solve with this project 

### in my previous position we wanted to use an angular text editor that could output a data that can be searched and filterd easily while preserving the formatting and layout of the text.


## Thinking Process 
    i started by thinking about what are the basic features of a rich text editor
    
    1. A text area that can be formatted with bold, italic, underline, etc.
    2. the editor should be able to output a data that can be searched and filterd easily 
    3. the editor should be able to output a data that can be previewed in a web page.
    4. the editor should be able to output a data that can be saved in a database.
    5. the output should be clean and semantic.
    6. the editor should have a minimal and modern UI. 
    7. the editor should support most of the basic text formatting options.
    8. the editor should support tables.
    9. the editor should support lists.
    10. the editor should support links.
    11. the editor should support images.
    12. the editor should support code blocks.
    13. the editor should support quotes.
    14. the editor should support horizontal rules.
    15. the editor should support headers.
    16. the editor should support text alignment.
    17. the editor should support text color.
    18. the editor should support text background color.
    19. the editor should support text font.
    20. the editor should support text size.

### after that i started thinking about the best way to implement this i come to conclusion that all of this is overkill and implementing the function that convert the html to plain text is enough to solve the issue while preserving the html tags in an object with the tag name and position in the original text and the plain text but i will create the editor for fun.



## testing strategy
    1. unit testing
    2. integration testing
    3. e2e testing
    4. testing before pushing (local)
    5. testing before deploying (local)
    

## technology stack

    1. Angular 21
    2. TypeScript
    3. SCSS
    4. RxJS
   

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
