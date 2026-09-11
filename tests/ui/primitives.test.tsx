import { afterEach, test } from "vitest";
import assert from "node:assert/strict";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Button } from "../../src/client/shared/ui/button.tsx";
import { NativeSelect } from "../../src/client/shared/ui/native-select.tsx";
import { Card } from "../../src/client/shared/ui/card.tsx";

afterEach(cleanup);

test("Button defaults to a safe non-submit action and preserves explicit submit", async () => {
  let submitted = 0;

  render(
    <Card asChild>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted++;
        }}
      >
        <Button>Inspect</Button>
        <Button type="submit">Submit</Button>
      </form>
    </Card>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Inspect" }));
  assert.equal(submitted, 0);
  await userEvent.click(screen.getByRole("button", { name: "Submit" }));
  assert.equal(submitted, 1);
});

test("native fields retain labels and disabled fieldset semantics", async () => {
  render(
    <fieldset disabled>
      <label htmlFor="mode">Mode</label>
      <NativeSelect id="mode" defaultValue="onsite">
        <option value="onsite">Onsite</option>
        <option value="remote">Remote</option>
      </NativeSelect>
    </fieldset>,
  );
  const select = screen.getByRole("combobox", { name: "Mode" });

  await userEvent.selectOptions(select, "remote");
  assert.equal((select as HTMLSelectElement).value, "onsite");
});
