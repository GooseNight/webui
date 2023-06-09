import { RSEAccountUsageLimit } from "@/lib/core/entity/rucio";
import { StoryFn, Meta } from "@storybook/react";
import { createRSEAccountUsageLimit } from "test/fixtures/table-fixtures";
import { CreateRuleRSETable as C } from "./CreateRuleRSETable";

export default {
    title: 'Components/Pages/CreateRule',
    component: C,
} as Meta<typeof C>;

const Template: StoryFn<typeof C> = (args) => <C {...args} />;

export const CreateRuleRSETable = Template.bind({});
CreateRuleRSETable.args = {
    tableData: {
        data: Array.from({ length: 100 }, (_, i) => createRSEAccountUsageLimit()),
        fetchStatus: "idle",
        pageSize: 10,
    },
    handleChange: (data: RSEAccountUsageLimit[]) => {console.info(data)},
};