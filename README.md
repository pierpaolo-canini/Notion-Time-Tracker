# Notion Time Tracker
a simple Time Tracker to record what you do directly in Notion

# How to Install
create a new Apps Script Project https://developers.google.com/apps-script/guides/projects
create all needed files and paste the corresponding code in this repository (no smarter way to do it that I know of)

![immagine](https://github.com/pierpaolo-canini/Notion-Time-Tracker/assets/52198643/b7c3edd3-6c3d-45a4-af70-b3a49a4dbed3)
![AnimationPaste](https://github.com/pierpaolo-canini/Notion-Time-Tracker/assets/52198643/2822961e-2748-4567-a2e4-8647cec6d0e3)

create two databases in your notion one for Projects and one for Time Entries. You can duplicate them from the templates: https://www.notion.so/antefatti/8fd2973d50a04a31a87c2d2d4c30a582?v=c25feb747ed94abe95f2a0e4f8bd2ecd&pvs=4 and https://www.notion.so/antefatti/f380f49a80874f4db48d4649f0e03c15?v=b928d31cc2954200910e1f2f92a93049&pvs=4
Setup the Projects column in the Time Entries database as a Relation to YOUR new Projects database

![AnimationRelation](https://github.com/pierpaolo-canini/Notion-Time-Tracker/assets/52198643/fddc49e5-5593-497c-9a54-0ac699573833)


Create a Notion Integration with read and write permissions and add it to the Projects database and to the Time Entries database. https://www.notion.so/my-integrations
Paste the integration secret in the setup.gs file
Paste the Project database id in the setup.gs file

it's easy to get the id if you're using Notion from the browser
![64967fd-small-62e5027-notion_database_id](https://github.com/pierpaolo-canini/Notion-Time-Tracker/assets/52198643/ba322fd2-c96c-4b46-a618-20fc88299feb)

Paste the Time Entries database id in the setup.gs file
Set a name for the Webapp, "Notion Time Tracker" is a good one
Save and Run it once to Authorize the functions

![AnimationAuth](https://github.com/pierpaolo-canini/Notion-Time-Tracker/assets/52198643/2e498569-2fbd-4ddd-818d-de100cddc16c)

Deploy the Webapp

![AnimationDeploy](https://github.com/pierpaolo-canini/Notion-Time-Tracker/assets/52198643/e8e92302-5317-430b-82a4-ff07df59faa5)
