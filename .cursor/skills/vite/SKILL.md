---
name: vite
description: When developing the client, do not run vite, it is already running with auto-reload.
---

If you ever have to test the client use npm run build isntead of starting the app to host it with npm run dev.

This project is focused on the client, our goal is to basically abandon gradio. creating a wrapper around the webui api.

Try to modify the original webui code as little as possible. (found in original-forge/ folder)

If you have to modify the original webui code, make sure to use this format:

#? explaination for following removal
#- <removed code>
#- <removed code>
#- <removed code>
#?end

-or-

#? explaination for following commented out code
# <commented out code>
# <commented out code>
# <commented out code>
#?end

#+ explanation for following addition
<added code>
<added code>
<added code>
#+end

Do not use this format for new code for our viteui fork!

Always add a "VITE UI" comment at the top files added to the viteui fork.
