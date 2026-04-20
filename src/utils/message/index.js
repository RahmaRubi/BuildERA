

const generateMessage = (entity) => 
(
    {
        alreadExist: `${entity} already exist`,
        createdSuccessfully: `${entity} created successfully`,
        updatedSuccessfully: `${entity} updated successfully`,
        deletedSuccessfully: `${entity} deleted successfully`,
        notFound : `${entity} not found!`,
        failToCreate: `fail to create ${entity}`,
        failToUpdate: `fail to update ${entity}`,
        failToDelete: `fail to delete ${entity}`

    }
)

export const messages = {
    user: {...generateMessage("user"), incorrectPassword: 'incorrect password', emailNotSent: "email not sent"},
}