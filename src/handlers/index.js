import { ButtonHandler } from './buttonHandler.js';
import { ModalHandler } from './modalHandler.js';
import { SelectHandler } from './selectHandler.js';

export class InteractionHandler {
  constructor() {
    this.buttonHandler = new ButtonHandler();
    this.modalHandler = new ModalHandler();
    this.selectHandler = new SelectHandler();
  }

  setClient(client) {
    this.modalHandler.setClient(client);
  }

  async handle(interaction) {
    try {
      if (interaction.isButton()) {
        await this.buttonHandler.handle(interaction);
      } else if (interaction.isModalSubmit()) {
        await this.modalHandler.handle(interaction);
      } else if (interaction.isStringSelectMenu()) {
        await this.selectHandler.handle(interaction);
      }
    } catch (error) {
      console.error('Error in interaction handler:', error);
      
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: '❌ Произошла ошибка при обработке взаимодействия',
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: '❌ Произошла ошибка при обработке взаимодействия',
            ephemeral: true,
          });
        }
      } catch (followUpError) {
        console.error('Error in interaction error handler:', followUpError);
      }
    }
  }
}
